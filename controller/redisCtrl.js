const redisData = require("../models/redisData");
const { Op } = require('sequelize')
const { createClient } = require('redis');
const redisClient = createClient(6380, 'localhost');

const response = {
    Status: "Success",
    Response: null,
    Message: null
}

const error = {
    Status: "Failed",
    Response: null,
    Message: null
}
redisClient.connect();
const postData = async (req, res) => {
    let postkey;
    try {
        let data;
        const body = req.body;
        if (Object.keys(body).length > 0) {
            if (Array.isArray(body)) {
                console.log("Many Data is inserted..");
                data = await redisData.bulkCreate(body);
                for (let data1 of data) {
                    postkey = `${data1.id}-${data1.name}-${data1.age}`;
                    await redisClient.set(postkey, JSON.stringify(data1));
                }

            } else {
                console.log("One data is inserted..");
                data = await redisData.create(body);
                postkey = `${data.id}-${data.name}-${data.age}`;
                await redisClient.set(postkey, JSON.stringify(data));

            }
        } else {
            throw Error(" Error :: Empty payload is not accepted..")
        }

        response.Response = data;
        res.status(201).json(response)
    } catch (err) {
        error.Message = err.message
        res.status(400).json(error)
    }
}

const deleteData = async (req, res) => {
    try {
        const { id, name, age } = req.query;
        console.log(id, name, age)
        let deletingData;
        let whereCondition = {};
        if (id && !name && !age) {
            console.log("id is present ..")
            deletingData = await redisClient.keys(`${id}-*`)
            whereCondition = { id: Number(id) }
        } else if (!id && name && age) {
            console.log("name age are present")
            deletingData = await redisClient.keys(`*-${name}-${age}`)
            whereCondition = { name: name, age: Number(age) }
        } else if (name && !age && !id) {
            console.log("name is present")
            deletingData = await redisClient.keys(`*-${name}-*`)
            whereCondition = { name: name }
        } else if (age && !id && !name) {
            console.log("age is present")
            deletingData = await redisClient.keys(`*${age}`)
            whereCondition = { age: Number(age) }
        }
        console.log("keys depends on query ---> ", deletingData)
        if (deletingData) {
            for (let del of deletingData) {
                await redisClient.del(del);
            }
        }
        const data = await redisData.destroy({ where: whereCondition })
        response.Response = data;
        res.status(200).json(response)
    } catch (err) {
        error.Message = err.message
        res.status(400).json(error)
    }
}

const updateData = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        let key;
        let deletingData = await redisClient.keys(`${id}-*`)
        if (deletingData) {
            await redisClient.del(deletingData[0]);
        }
        const data = await redisData.update(body, { where: { id: Number(id) } });
        const data1 = await redisData.findByPk(Number(id));
        key = `${data1.id}-${data1.name}-${data1.age}`
        await redisClient.set(key, JSON.stringify(data1));
        response.Response = data;
        res.status(200).json(response)
    } catch (err) {
        error.Message = err.message
        res.status(400).json(error)
    }
}
const filteringData = async (req, res) => {
    try {
        const payload = req.body;
        console.log("payload -->", Object.keys(payload).length)
        let data, filteredData;
        filteredData = await filterByprovidedData(payload);
        if (filteredData) {
            console.log("Data from cache...");
            data = filteredData;
        } else {
            console.log("Data from Database...");
            data = await dataFromDB(payload);
        }

        response.Response = data;
        res.status(200).json(response)

    } catch (err) {
        error.Message = err.message
        res.status(400).json(error)
    }
}

const dataFromDB = async (body) => {
    try {
        let whereCondition;
        const { id, name, minAge, maxAge } = body;
        if (Object.keys(body).length > 0) {
            if ((!minAge && !maxAge) && (id || name)) {
                console.log("Age is not present ...")
                if (id && !name) {
                    console.log("Only Id is present..")
                    whereCondition = { id: { [Op.substring]: id } };
                } else if (name && !id) {
                    console.log("Only name is present..")
                    whereCondition = { name: { [Op.substring]: name } };
                } else if (name && id) {
                    console.log("Only Id  & Name are  present..")
                    whereCondition = { id: { [Op.substring]: id }, name: { [Op.substring]: name } };
                }
            }
            if (minAge && maxAge) {
                if (!id && !name && minAge && maxAge) {
                    console.log("Only age is present..")
                    whereCondition = { age: { [Op.between]: [minAge, maxAge] } };
                }
                if (id && !name && minAge && maxAge) {
                    console.log("Only Id & age are present..")
                    whereCondition = { id: { [Op.substring]: id }, age: { [Op.between]: [minAge, maxAge] } }
                }
                if (!id && name && minAge && maxAge) {
                    console.log('Only age & name are present..')
                    whereCondition = { name: { [Op.substring]: name }, age: { [Op.between]: [minAge, maxAge] } };
                }
                if (id && name && minAge && maxAge) {
                    console.log('name, age  & id are present ...')
                    whereCondition = { id: { [Op.substring]: id }, name: { [Op.substring]: name }, age: { [Op.between]: [minAge, maxAge] } };
                }

            }
        } else {
            console.log("payload is not present ..")
            whereCondition = {};
        }
        const data = await redisData.findAll({ where: whereCondition });
        console.log("Fetched data from database .. ", data)
        for (let data1 of data) {
            key = `${data1.id}-${data1.name}-${data1.age}`
            await redisClient.set(key, JSON.stringify(data1));
        }
        return data;

    } catch (err) {
        console.log("Error in dataFromDb --> ", err.message)
        return err;
    }
}


const filterByprovidedData = async (body) => {
    try {
        let keysArr, jsonData, resultArr = [];
        const { id, name, minAge, maxAge } = body;
        if (Object.keys(body).length > 0) {
            if ((!minAge && !maxAge) && (id || name)) {
                console.log("Age is not present ...")
                if (id && !name) {
                    console.log("Only Id is present..")
                    keysArr = await redisClient.keys(`${body.id}*`);
                } else if (name && !id) {
                    console.log("Only name is present..")
                    keysArr = await redisClient.keys(`*${name}*`);
                } else {
                    console.log("Only Id  & Name are  present..")
                    keysArr = await redisClient.keys(`${id}*${name}*`);
                    console.log("id && name ---->", keysArr);
                }
                for (let key of keysArr) {
                    jsonData = JSON.parse(await redisClient.get(key));
                    resultArr.push(jsonData);
                }
                console.log("Result in filter---> ", resultArr)
            }
            if (minAge && maxAge) {
                if (!id && !name && minAge && maxAge) {
                    console.log("Only age is present..")
                    keysArr = await redisClient.keys('*');
                }
                if (id && !name && minAge && maxAge) {
                    console.log("Only Id & age are present..")
                    keysArr = await redisClient.keys(`${id}*`);
                }
                if (!id && name && minAge && maxAge) {
                    console.log('Only age & name are present..')
                    keysArr = await redisClient.keys(`*${name}*`);
                }
                if (id && name && minAge && maxAge) {
                    console.log('name, age  & id are present ...')
                    keysArr = await redisClient.keys(`${id}*${name}*`);
                }
                console.log("All Keys are --->", keysArr)
                for (let key of keysArr) {
                    jsonData = JSON.parse(await redisClient.get(key));
                    if (jsonData.age >= minAge && jsonData.age <= maxAge) {
                        resultArr.push(jsonData);
                    }
                }
            }
        } else {
            console.log("payload is not present ..")
            keysArr = await redisClient.keys('*');
            console.log("Empty payLoad --> ", keysArr);
            for (let key of keysArr) {
                resultArr.push(JSON.parse(await redisClient.get(key)));
            }

        }
        return resultArr;
    } catch (err) {
        console.log("Error in filterByprovidedData Function :: ", err)
    }
}
const resetting = async () => {
    try {
        let key;
        await redisClient.flushAll();
        const data = await redisData.findAll({});
        for (let data1 of data) {
            key = `${data1.id}-${data1.name}-${data1.age}`
            await redisClient.set(key, JSON.stringify(data1));
        }
    } catch (err) {
        console.log(err)
    }
}
module.exports = {
    postData,
    deleteData,
    updateData,
    //getOneData,
    resetting,
    filteringData
}
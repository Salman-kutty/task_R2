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
redisClient.connect()
    .then(() => console.log("Redis is connected ..."))
    .catch((err) => console.log("Error while connecting redis ...", err))
//redisClient.flushAll();
const postData = async (req, res) => {
    let postkey;
    try {
        let data;
        const body = req.body;
        if (body) {
            if (body instanceof Array) {
                console.log("Many Data is inserted..");
                data = await redisData.bulkCreate(body);
                for (let i = 0; i < data.length; i++) {
                    postkey = `#id:${data[i].id}#${data[i].name}#${data[i].age}`;
                    await redisClient.set(postkey, JSON.stringify(single));
                }

            } else {
                console.log("One data is inserted..");
                data = await redisData.create(body);
                postkey = `#id:${data.id}#name:${data.name}#age:${data.age}`;
                await redisClient.set(postkey, JSON.stringify(data));

            }
        } else {
            throw Error("Request body is Empty");
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
        let id = req.params.id;
        let deletingData = await redisClient.keys(`*id:${id}*`)
        if (deletingData) {
            await redisClient.del(deletingData[0]);
        }
        const data = await redisData.destroy({ where: { id: Number(id) } })
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
        let deletingData = await redisClient.keys(`*id:${id}*`)
        if (deletingData) {
            await redisClient.del(deletingData[0]);
        }
        const data = await redisData.update(body, { where: { id: Number(id) } });
        const data1 = await redisData.findByPk(Number(id));
        key = `#id:${data1.id}#name:${data1.name}#age:${data1.age}`
        redisClient.set(key, JSON.stringify(data1));
        response.Response = data;
        res.status(200).json(response)
    } catch (err) {
        error.Message = err.message
        res.status(400).json(error)
    }
}
const getAllData = async (req, res) => {
    try {
        //         let key, id, name, age, data;
        //         let cacheKeys = await redisClient.key('*')
        //         console.log(cacheKeys)

        //         data = await redisData.findAll({});
        //         data.map((single) => {
        //             id = JSON.stringify(single.id);
        //             name = single.name;
        //             age = JSON.stringify(single.age);
        //             key = `#id:${id}#name:${name}#age:${age}`;
        //             redisClient.set(key, JSON.stringify(single))
        //         })


        // let key, data, dataValue, cacheData;
        // let dummy, dummyKey;
        // const common = req.query;
        // if (common.id) {
        //     dataValue = common.id
        //     key = `#id:${dataValue}`

        // } else if (common.name) {
        //     console.log(typeof common.name)
        //     dataValue = common.name
        //     key = `#name:${dataValue}`;

        // }
        // cacheData = JSON.parse(await redisClient.get(key))
        // dummyKey = await redisClient.keys(`#name:*${req.query.name}*`)
        // console.log(dummyKey)
        // console.log(await redisClient.get(dummyKey[1]))
        // if (cacheData) {
        //     console.log("From Cache...")
        //     data = cacheData;

        // } else {
        //     console.log("From DB...")
        //     if (common.id) {
        //         data = await redisData.findOne({ where: { id: dataValue } })
        //         redisClient.set(key, JSON.stringify(data))
        //     } else if (common.name) {
        //         data = await redisData.findOne({ where: { name: dataValue } })
        //         redisClient.set(key, JSON.stringify(data))
        //     }

        // }

        //         response.Response = data;
        //         res.status(200).json(response)
    } catch (err) {
        //         error.Message = err.message
        //         res.status(400).json(error)
    }
}

const getOneData = async (req, res) => {
    try {
        let paramData = req.query;
        let bodyData = req.body;
        let data, key, dataArr;
        if (Object.keys(bodyData).length === 0) {
            if (paramData.name || paramData.id) {
                console.log("Goinng single..")
                dataArr = await searchBySingleData(paramData, bodyData);
            }
        } else if (Object.keys(bodyData).length !== 0) {
            if (Object.keys(paramData).length === 0) {
                console.log("Only body")
                dataArr = await searchBySingleData(paramData, bodyData);
            } else {
                console.log("Body & param")
                dataArr = await searchByTwoParameter(paramData, bodyData);
            }
        }

        console.log("33333", dataArr)
        if (dataArr && dataArr.length > 0) {
            console.log("From cache...");
            data = dataArr;
        } else {
            console.log("From db")
            let whereCondition;
            if (Object.keys(paramData).length === 1 || Object.keys(paramData).length === 0) {
                if (paramData.id) {
                    whereCondition = { id: { [Op.substring]: Number(paramData.id) } };
                } else if (paramData.name) {
                    whereCondition = { name: { [Op.substring]: paramData.name } };
                } else if (body) {
                    whereCondition = { age: { [Op.between]: [bodyData.start, bodyData.end] } };
                }
            } else if (Object.keys(paramData).length === 3) {
                whereCondition = { id: Number(paramData.id), name: { [Op.substring]: paramData.name }, age: Number(paramData.age) }
            } else if ((Object.keys(paramData).length === 2 || Object.keys(paramData).length === 1) && !paramData.id) {
                whereCondition = { name: { [Op.substring]: paramData.name }, age: { [Op.between]: [bodyData.start, bodyData.end] } }
            }
            data = await redisData.findAll({ where: whereCondition });
            for (let i = 0; i < data.length; i++) {
                key = `#id:${data[i].id}#name:${data[i].name}#age:${data[i].age}`
                await redisClient.set(key, JSON.stringify(data));
            }

        }
        response.Response = data;
        res.status(200).json(response)
    } catch (err) {
        error.Message = err.message
        res.status(400).json(error)
    }
}

const searchBySingleData = async (query, body) => {
    try {
        let arr = [];
        let keysData, parseData;
        if (Object.keys(body).length === 0) {
            if (query.id) {
                keysData = await redisClient.keys(`*id:${query.id}*`);
            } else if (query.name) {
                keysData = await redisClient.keys(`*${query.name}*`);
            }
            for (let i = 0; i < keysData.length; i++) {
                arr.push(JSON.parse(await redisClient.get(keysData[i])));
            }
        } else {
            keysData = await redisClient.keys(`*`);
            for (let i = 0; i < keysData.length; i++) {
                parseData = JSON.parse(await redisClient.get(keysData[i]))
                if (parseData.age >= body.start && parseData.age <= body.end) {
                    arr.push(parseData)
                }
            }
        }
        return arr
    } catch (err) {
        console.log("Error ::", err.message)
        return err;
    }
}





const searchByTwoParameter = async (query, body) => {
    try {
        let arr = [];
        let keysData, parseData;
        if (query.id) {
            keysData = await redisClient.keys(`*id:${query.id}*`);
            for (let i = 0; i < keysData.length; i++) {
                parseData = JSON.parse(await redisClient.get(keysData[i]))
                arr.push(parseData);
            }
        } else if (!query.id && (query.name && body)) {
            console.log("TWO name & age --->")
            keysData = await redisClient.keys(`*${query.name}*`)
            console.log("kkkk", keysData)
            for (let i = 0; i < keysData.length; i++) {
                parseData = JSON.parse(await redisClient.get(keysData[i]));
                console.log(parseData)
                if (parseData.age >= body.start && parseData.age <= body.end) {
                    arr.push(parseData)
                }

            }
        }
        console.log("arr----->", arr)
        return arr;
    } catch (err) {
        console.log("Error :: ", err)
        return err;
    }
}
const resetting = async () => {
    try {
        let key;
        await redisClient.flushAll();
        const data = await redisData.findAll({});
        for (let i = 0; i < data.length; i++) {
            key = `#id:${data[i].id}#name:${data[i].name}#age:${data[i].age}`;
            await redisClient.set(key, JSON.stringify(data[i]));
        }

    } catch (err) {
        console.log(err)
    }
}
module.exports = {
    postData,
    deleteData,
    updateData,
    getAllData,
    getOneData,
    resetting
}
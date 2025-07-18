// require('dotenv').config();
const mangoose=require('mongoose')
const dataurl=process.env.MONGO_URI;
const connectomango= async()=>{
    try {
        await mangoose.connect(dataurl).then(() => console.log("Connected to MongoDB"))
    } catch (err) {
        console.error("Connection error:", err.message);
    }
}
module.exports=connectomango;
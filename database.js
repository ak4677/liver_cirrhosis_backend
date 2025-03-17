const mangoose=require('mongoose')
const dataurl="mongodb://localhost:27017/?tls=false&readPreference=primary&appName=MongoDB%25Compass&directConnection=true"
const connectomango= async()=>{
    await mangoose.connect(dataurl).then(
        console.log("connected to dataset")
    )
}
module.exports=connectomango;
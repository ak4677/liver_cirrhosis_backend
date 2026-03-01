require('dotenv').config({ path: __dirname + '/.env' })
const express = require('express')
const connectomango = require('./database')
const cors=require('cors')
const path=require('path')
const app = express()
const port = 5000

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',require('./Routes/auth'))
app.use('/api/datatras',require('./Routes/datatras'))
app.use('/api/models',require('./Routes/models'))
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
connectomango();
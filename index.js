const express = require('express')
const connectomango = require('./database')
const cors=require('cors')

const app = express()
const port = 5000

app.use(cors())
app.use(express.json())

app.use('/api/auth',require('./Routes/auth'))
app.use('/api/datatras',require('./Routes/datatras'))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
connectomango();
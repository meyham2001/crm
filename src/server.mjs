import express from 'express'
import cors from 'cors'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 4901

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files from dist directory (for React frontend)
app.use(express.static(path.join(process.cwd(), 'dist')))

// Serve React app for all other routes  
app.get('{*splat}', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
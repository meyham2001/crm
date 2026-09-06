const express = require('express')
const cors = require('cors')
const path = require('path')
const { db } = require('./db/database')

const app = express()
const PORT = process.env.PORT || 4901

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files from dist directory (for React frontend)
app.use(express.static(path.join(__dirname, '../dist')))

// Basic API endpoints that just return success for now to avoid frontend errors
app.get('/api/organizations', (req, res) => {
  res.json([])
})

app.post('/api/organizations', (req, res) => {
  res.status(201).json({ id: 'test-id', name: 'Test Org' })
})

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
// Express.js API for the after-school lessons coursework project.
// Uses the native MongoDB driver and exposes lessons, orders, search, and image routes.
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { MongoClient, ObjectId } = require('mongodb')

const app = express()
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.DB_NAME || 'courseworkDB'

// Utility: normalize string for case-insensitive search
function normalize(str) {
  return String(str ?? '').trim().toLowerCase()
}

if (!MONGODB_URI) {
  console.warn('[server] MONGODB_URI is not set. Please configure it in .env')
}

let db
let lessonsCollection
let ordersCollection

// --- Middleware ---

// Logger middleware: log method, URL, and time
app.use((req, res, next) => {
  const started = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - started
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`) // coursework logger
  })
  next()
})

app.use(cors())
app.use(express.json())

// Static images middleware
const IMAGES_DIR = path.join(__dirname, 'public', 'images')

app.get('/images/:fileName', (req, res) => {
  const filePath = path.join(IMAGES_DIR, req.params.fileName)

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'Image file does not exist' })
    }
    res.sendFile(filePath)
  })
})

// --- REST API ---

// GET /lessons -> all lessons
app.get('/lessons', async (req, res) => {
  try {
    const docs = await lessonsCollection.find({}).toArray()

    const payload = docs.map((doc) => ({
      id: doc._id.toString(),
      subject: doc.subject || doc.topic,
      location: doc.location,
      price: doc.price,
      spaces: doc.spaces ?? doc.space,
      description: doc.description,
      image: doc.image,
      addedAt: doc._id.getTimestamp() // include creation timestamp
    }))

    res.json(payload)
  } catch (err) {
    console.error('GET /lessons failed:', err)
    res.status(500).json({ error: 'Failed to fetch lessons' })
  }
})

// GET /search?q=... -> multi-field search
app.get('/search', async (req, res) => {
  const q = normalize(req.query.q)

  try {
    let docs

    if (!q) {
      docs = await lessonsCollection.find({}).toArray()
    } else {
      const regex = new RegExp(q, 'i')
      const numberVal = Number(q)
      const isNumber = !Number.isNaN(numberVal)

      const orConditions = [
        { subject: regex },
        { topic: regex },
        { location: regex },
        { description: regex }
      ]

      if (isNumber) {
        orConditions.push({ price: numberVal })
        orConditions.push({ spaces: numberVal })
        orConditions.push({ space: numberVal })
      }

      docs = await lessonsCollection.find({ $or: orConditions }).toArray()
    }

    const payload = docs.map((doc) => ({
      id: doc._id.toString(),
      subject: doc.subject || doc.topic,
      location: doc.location,
      price: doc.price,
      spaces: doc.spaces ?? doc.space,
      description: doc.description,
      image: doc.image,
      addedAt: doc._id.getTimestamp()
    }))

    res.json(payload)
  } catch (err) {
    console.error('GET /search failed:', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

// POST /orders -> create new order
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, email, items } = req.body || {}

    if (!name || !phone || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Missing required order fields' })
    }

    const parsedItems = items.map((item) => ({
      lessonId: new ObjectId(item.lessonId),
      spaces: Number(item.spaces || item.quantity || 0)
    }))

    const doc = {
      name,
      phone,
      email,
      items: parsedItems,
      createdAt: new Date()
    }

    const result = await ordersCollection.insertOne(doc)
    res.status(201).json({ id: result.insertedId.toString(), ...doc })
  } catch (err) {
    console.error('POST /orders failed:', err)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// PUT /lessons/:id -> update lesson attributes (e.g. spaces after an order)
app.put('/lessons/:id', async (req, res) => {
  const { id } = req.params

  try {
    const update = req.body || {}

    if (update.spaces !== undefined) {
      update.spaces = Number(update.spaces)
    }

    const result = await lessonsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    )

    if (!result.value) {
      return res.status(404).json({ error: 'Lesson not found' })
    }

    res.json(result.value)
  } catch (err) {
    console.error('PUT /lessons/:id failed:', err)
    res.status(500).json({ error: 'Failed to update lesson' })
  }
})

// Health check with uptime
app.get('/', (req, res) => {
  const docs = {
    title: 'After-school lessons API',
    status: 'ok',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    uptime: process.uptime(),
    endpoints: {
      'GET /': { description: 'This API documentation' },
      'GET /lessons': {
        description: 'Fetch all lessons',
        response: 'Array of lesson objects with id, subject, location, price, spaces, description, image, addedAt'
      },
      'GET /search': {
        description: 'Search lessons by query',
        parameters: { q: 'string (searches subject, location, description; also matches numeric price/spaces)' },
        example: '/search?q=music or /search?q=20'
      },
      'POST /orders': {
        description: 'Create a new order/reservation',
        body: { name: 'string', phone: 'string', email: 'string', items: 'Array of {lessonId, spaces}' },
        response: 'Created order object with id'
      },
      'PUT /lessons/:id': {
        description: 'Update a lesson (commonly used to decrement spaces after order)',
        parameters: { id: 'MongoDB ObjectId string' },
        body: { spaces: 'number' },
        response: 'Updated lesson object'
      },
      'GET /images/:fileName': {
        description: 'Serve static lesson images',
        parameters: { fileName: 'string (image filename)' },
        response: 'Image file or 404 if not found'
      }
    },
    notes: [
      'All lesson responses include an `id` field (stringified ObjectId).',
      'Use the lesson `id` when creating orders or updating lesson spaces.',
      'Search is case-insensitive and matches partial strings in text fields.'
    ]
  }
  res.json(docs)
})

// --- Start server once Mongo is connected ---

async function start() {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(DB_NAME)
    lessonsCollection = db.collection('lessons')
    ordersCollection = db.collection('orders')

    console.log(`[server] Connected to MongoDB database "${DB_NAME}"`)

    app.listen(PORT, () => {
      console.log(`Express API listening on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()

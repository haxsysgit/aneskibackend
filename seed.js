require('dotenv').config()

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.DB_NAME || 'courseworkDB'

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env')
  process.exit(1)
}

const seedLessons = [
  {
    topic: 'Algebra II',
    location: 'Room 204',
    price: 38,
    space: 5,
    description: 'Quadratic, exponential, and polynomial problem solving with guided practice.',
    image: 'https://www.svgrepo.com/show/311604/math.svg'
  },
  {
    topic: 'Biology Lab',
    location: 'Science Lab B',
    price: 42,
    space: 5,
    description: 'Microscope work and dissections that bring cellular biology to life.',
    image: 'https://www.svgrepo.com/show/385149/biology-experiment-lab-laboratory-research-science.svg'
  },
  {
    topic: 'Chemistry Honors',
    location: 'Chemistry Lab',
    price: 44,
    space: 5,
    description: 'Reactions, stoichiometry, and weekly safety-focused experiments.',
    image: 'https://www.svgrepo.com/show/82732/chemistry-lab-instruments.svg'
  },
  {
    topic: 'Physics Workshop',
    location: 'Innovation Studio',
    price: 46,
    space: 5,
    description: 'Motion labs, energy challenges, and simple robotics tie-ins.',
    image: 'https://www.svgrepo.com/show/197819/physics-science.svg'
  },
  {
    topic: 'English Literature',
    location: 'Library Commons',
    price: 36,
    space: 5,
    description: 'Close reading, essay writing, and seminar-style discussions.',
    image: 'https://www.svgrepo.com/show/230246/books-literature.svg'
  },
  {
    topic: 'World History',
    location: 'Room 112',
    price: 34,
    space: 5,
    description: 'Global movements and key decisions from ancient to modern eras.',
    image: 'https://www.svgrepo.com/show/520522/globe.svg'
  },
  {
    topic: 'Computer Science Principles',
    location: 'Tech Lab',
    price: 48,
    space: 5,
    description: 'Algorithms, interactive apps, and ethical computing foundations.',
    image: 'https://www.svgrepo.com/show/294200/coding-programming-language.svg'
  },
  {
    topic: 'French Conversation',
    location: 'Language Studio',
    price: 33,
    space: 5,
    description: 'Roleplay, listening drills, and everyday vocabulary.',
    image: 'https://www.svgrepo.com/show/43090/french.svg'
  },
  {
    topic: 'Studio Art',
    location: 'Art Atelier',
    price: 40,
    space: 5,
    description: 'Charcoal, acrylics, and mixed media portfolio pieces.',
    image: 'https://www.svgrepo.com/show/205590/paint-palette-art-and-design.svg'
  },
  {
    topic: 'Music Ensemble',
    location: 'Music Room',
    price: 37,
    space: 5,
    description: 'Contemporary charts and small-group performance skills.',
    image: 'https://www.svgrepo.com/show/109458/music-notes.svg'
  },
  {
    topic: 'AP Economics',
    location: 'Room 305',
    price: 45,
    space: 5,
    description: 'Market simulations and data-driven policy case studies.',
    image: 'https://www.svgrepo.com/show/11834/economy.svg'
  },
  {
    topic: 'Health & Wellness',
    location: 'Wellness Center',
    price: 32,
    space: 5,
    description: 'Nutrition, mindfulness, and fitness planning for balanced living.',
    image: 'https://www.svgrepo.com/show/339260/heart-health.svg'
  },
  {
    topic: 'Environmental Science',
    location: 'Greenhouse Lab',
    price: 41,
    space: 5,
    description: 'Ecosystems, sustainability challenges, and field data collection.',
    image: 'https://www.svgrepo.com/show/456300/leaf-globe.svg'
  }
]

async function run() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(DB_NAME)
    const lessons = db.collection('lessons')

    console.log(`[seed] Connected to ${DB_NAME}, seeding lessons...`)

    await lessons.deleteMany({})
    const result = await lessons.insertMany(seedLessons)

    console.log(`[seed] Inserted ${result.insertedCount} lessons.`)
  } catch (err) {
    console.error('[seed] Failed to seed lessons:', err)
    process.exitCode = 1
  } finally {
    await client.close()
  }
}

run()

const express = require('express')
const cors = require('cors')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const app = express()
const PORT = process.env.PORT || 5000
const BOOKINGS_FILE = path.join(__dirname, 'data', 'bookings.json')

const movies = [
  {
    id: 'dune',
    title: 'Дюна: Частина друга',
    genre: 'Фантастика',
    duration: 166,
    rating: '8.5',
    ageRating: '16+',
    description: 'Пол Атрід об’єднується з Чані та фременами, щоб помститися змовникам і змінити долю Арракіса.',
    poster: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    schedule: [
      { time: '13:20', format: '2D', room: 'Зал 1', price: 220 },
      { time: '16:40', format: 'IMAX', room: 'Зал 1', price: 290 },
      { time: '20:00', format: '2D', room: 'Зал 2', price: 250 },
    ],
  },
  {
    id: 'interstellar',
    title: 'Інтерстеллар',
    genre: 'Драма',
    duration: 169,
    rating: '8.7',
    ageRating: '12+',
    description: 'Команда дослідників вирушає крізь простір і час у пошуках нового дому для людства.',
    poster: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    schedule: [
      { time: '14:10', format: '2D', room: 'Зал 2', price: 220 },
      { time: '18:10', format: 'IMAX', room: 'Зал 1', price: 290 },
      { time: '21:15', format: '2D', room: 'Зал 3', price: 250 },
    ],
  },
  {
    id: 'wicked',
    title: 'Wicked: Чародійка',
    genre: 'Пригоди',
    duration: 160,
    rating: '7.8',
    ageRating: '12+',
    description: 'Історія незвичайної дружби Ельфаби та Ґлінди у чарівній країні Оз.',
    poster: 'https://image.tmdb.org/t/p/w780/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/uJ3WH3a5GxKGZWdtsvD5gYz5E7e.jpg',
    schedule: [
      { time: '12:30', format: '2D', room: 'Зал 3', price: 200 },
      { time: '16:00', format: '2D', room: 'Зал 2', price: 240 },
      { time: '19:30', format: 'IMAX', room: 'Зал 1', price: 290 },
    ],
  },
  {
    id: 'inside-out-2',
    title: 'Думками навиворіт 2',
    genre: 'Анімація',
    duration: 96,
    rating: '7.6',
    ageRating: '0+',
    description: 'У штаб-квартирі Райлі з’являються нові емоції — і звичний порядок змінюється.',
    poster: 'https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/5hoS3nEkGGXUfmnu39yw1k52JX5.jpg',
    schedule: [
      { time: '11:40', format: '2D', room: 'Зал 2', price: 180 },
      { time: '14:20', format: '2D', room: 'Зал 3', price: 200 },
      { time: '17:00', format: '2D', room: 'Зал 2', price: 220 },
    ],
  },
  {
    id: 'deadpool',
    title: 'Дедпул і Росомаха',
    genre: 'Комедія',
    duration: 128,
    rating: '7.5',
    ageRating: '18+',
    description: 'Найбалакучіший найманець у всесвіті вирушає у пригоду разом із легендарним Росомахою.',
    poster: 'https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/cyecB7godJ6kNHGONFjUyVN9OX5.jpg',
    schedule: [
      { time: '13:00', format: '2D', room: 'Зал 3', price: 220 },
      { time: '17:30', format: '2D', room: 'Зал 1', price: 250 },
      { time: '21:00', format: 'IMAX', room: 'Зал 1', price: 290 },
    ],
  },
]

app.use(cors())
app.use(express.json({ limit: '20kb' }))

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function getShowtimes(movie, date) {
  return movie.schedule.map((session) => ({
    id: `${date}_${movie.id}_${session.time.replace(':', '')}`,
    date,
    time: session.time,
    format: session.format,
    room: session.room,
    price: session.price,
  }))
}

function findShowtime(showtimeId) {
  for (const movie of movies) {
    const match = showtimeId.match(new RegExp(`^(\\d{4}-\\d{2}-\\d{2})_${movie.id}_(\\d{4})$`))
    if (!match || !isValidDate(match[1])) continue
    const session = movie.schedule.find((item) => item.time.replace(':', '') === match[2])
    if (session) {
      return {
        movie,
        date: match[1],
        time: session.time,
        format: session.format,
        room: session.room,
        price: session.price,
        id: showtimeId,
      }
    }
  }
  return null
}

function readBookings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'))
    if (!Array.isArray(parsed)) throw new Error('Файл бронювань має некоректний формат.')
    return parsed
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

function saveBookings(bookings) {
  fs.mkdirSync(path.dirname(BOOKINGS_FILE), { recursive: true })
  fs.writeFileSync(BOOKINGS_FILE, `${JSON.stringify(bookings, null, 2)}\n`, 'utf8')
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/movies', (req, res) => {
  const date = req.query.date
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Вкажіть коректну дату у форматі РРРР-ММ-ДД.' })
  }

  res.set('Cache-Control', 'no-store')
  res.json({
    movies: movies.map(({ schedule, ...movie }) => ({
      ...movie,
      showtimes: getShowtimes({ ...movie, schedule }, date),
    })),
  })
})

app.get('/api/showtimes/:showtimeId/seats', (req, res) => {
  const showtime = findShowtime(req.params.showtimeId)
  if (!showtime) {
    return res.status(404).json({ error: 'Сеанс не знайдено.' })
  }

  const bookedSeats = readBookings()
    .filter((booking) => booking.showtimeId === showtime.id)
    .flatMap((booking) => booking.seats)
  res.json({ showtimeId: showtime.id, bookedSeats })
})

app.post('/api/bookings', (req, res) => {
  const { showtimeId, seats, name, email } = req.body || {}
  const showtime = typeof showtimeId === 'string' ? findShowtime(showtimeId) : null
  const normalizedName = typeof name === 'string' ? name.trim() : ''
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!showtime) {
    return res.status(400).json({ error: 'Оберіть сеанс із розкладу.' })
  }
  if (!Array.isArray(seats) || seats.length === 0 || seats.length > 8) {
    return res.status(400).json({ error: 'Оберіть від 1 до 8 місць.' })
  }
  if (new Set(seats).size !== seats.length || seats.some((seat) => typeof seat !== 'string' || !/^[A-H](?:[1-9]|10)$/.test(seat))) {
    return res.status(400).json({ error: 'Схема залу містить некоректні місця.' })
  }
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return res.status(400).json({ error: 'Ім’я має містити від 2 до 80 символів.' })
  }
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Вкажіть коректну електронну пошту.' })
  }

  const bookings = readBookings()
  const alreadyBooked = new Set(
    bookings
      .filter((booking) => booking.showtimeId === showtime.id)
      .flatMap((booking) => booking.seats),
  )
  if (seats.some((seat) => alreadyBooked.has(seat))) {
    return res.status(409).json({ error: 'Одне або кілька обраних місць уже зайняте. Оновіть схему залу та оберіть інші.' })
  }

  const booking = {
    code: `KK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    showtimeId: showtime.id,
    movieId: showtime.movie.id,
    movieTitle: showtime.movie.title,
    date: showtime.date,
    time: showtime.time,
    room: showtime.room,
    seats,
    name: normalizedName,
    email: normalizedEmail,
    total: showtime.price * seats.length,
    createdAt: new Date().toISOString(),
  }

  saveBookings([...bookings, booking])
  res.status(201).json({ booking })
})

app.get('/api/bookings', (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Вкажіть коректну електронну пошту.' })
  }

  const bookings = readBookings()
    .filter((booking) => booking.email === email)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
  res.json({ bookings })
})

app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) return next(error)
  res.status(500).json({ error: 'Внутрішня помилка сервера. Спробуйте ще раз пізніше.' })
})

app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`)
})

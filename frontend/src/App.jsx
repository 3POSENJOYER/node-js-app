import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const GENRES = ['Усі', 'Фантастика', 'Пригоди', 'Драма', 'Комедія', 'Анімація']
const SEAT_ROWS = 'ABCDEFGH'.split('')
const SEATS_PER_ROW = 10

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'Не вдалося виконати запит. Спробуйте ще раз.')
  }

  return payload
}

function getDateOptions() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    const value = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    return {
      value,
      weekday: index === 0 ? 'Сьогодні' : new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }).format(date),
      day: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(date),
    }
  })
}

function Header({ page, onNavigate }) {
  return (
    <header className="site-header">
      <a className="brand" href="#home" onClick={() => onNavigate('home')}>
        <span className="brand-mark" aria-hidden="true">К</span>
        <span>КІНО<span className="brand-accent">КАДР</span></span>
      </a>
      <nav className="main-nav" aria-label="Головна навігація">
        <button className={page === 'home' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('home')}>Афіша</button>
        <a className="nav-link" href="#about">Про кінотеатр</a>
        <button className={page === 'tickets' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('tickets')}>Мої квитки</button>
      </nav>
      <a className="header-location" href="#movies" onClick={() => onNavigate('home')}>
        <span className="location-dot" />
        Київ <span aria-hidden="true">⌄</span>
      </a>
    </header>
  )
}

function MovieCard({ movie, onSelectShowtime }) {
  return (
    <article className="movie-card">
      <div className={`poster poster-${movie.id}`}>
        <img
          src={movie.poster}
          alt={`Постер фільму «${movie.title}»`}
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none' }}
        />
        <span className="poster-rating">★ {movie.rating}</span>
        <span className="poster-format">{movie.ageRating}</span>
      </div>
      <div className="movie-info">
        <div className="movie-meta">{movie.genre} <span>·</span> {movie.duration} хв</div>
        <h3>{movie.title}</h3>
        <p className="movie-description">{movie.description}</p>
        <div className="showtime-list" aria-label={`Сеанси фільму ${movie.title}`}>
          {movie.showtimes.map((showtime) => (
            <button
              className="showtime-button"
              key={showtime.id}
              onClick={() => onSelectShowtime({ ...showtime, movie })}
              aria-label={`Купити квиток на ${movie.title}, ${showtime.time}`}
            >
              {showtime.time}
            </button>
          ))}
        </div>
        <div className="movie-card-footer">
          <span>{movie.showtimes[0]?.format || '2D'} · {movie.showtimes[0]?.room || 'Зал 1'}</span>
          <span>від {movie.showtimes[0]?.price || 0} ₴</span>
        </div>
      </div>
    </article>
  )
}

function BookingModal({ showtime, onClose, onBooked }) {
  const [bookedSeats, setBookedSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [contact, setContact] = useState({ name: '', email: '' })
  const [loadingSeats, setLoadingSeats] = useState(true)
  const [seatsLoaded, setSeatsLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(null)
  const total = selectedSeats.length * showtime.price

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  useEffect(() => {
    let active = true
    request(`/api/showtimes/${encodeURIComponent(showtime.id)}/seats`)
      .then((result) => {
        if (active) {
          setBookedSeats(result.bookedSeats)
          setSeatsLoaded(true)
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoadingSeats(false)
      })

    return () => { active = false }
  }, [showtime.id])

  function toggleSeat(seat) {
    setSelectedSeats((current) => current.includes(seat)
      ? current.filter((item) => item !== seat)
      : [...current, seat])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          showtimeId: showtime.id,
          seats: selectedSeats,
          name: contact.name,
          email: contact.email,
        }),
      })
      setBooking(result.booking)
      onBooked(result.booking)
    } catch (requestError) {
      setError(requestError.message)
      if (requestError.message.includes('вже зайняте')) {
        try {
          const result = await request(`/api/showtimes/${encodeURIComponent(showtime.id)}/seats`)
          setBookedSeats(result.bookedSeats)
          setSelectedSeats((current) => current.filter((seat) => !result.bookedSeats.includes(seat)))
        } catch (refreshError) {
          setError(`${requestError.message} Не вдалося оновити схему залу: ${refreshError.message}`)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="modal-close" onClick={onClose} aria-label="Закрити">×</button>
        {booking ? (
          <div className="booking-success">
            <div className="success-icon" aria-hidden="true">✓</div>
            <p className="eyebrow">БРОНЮВАННЯ ПІДТВЕРДЖЕНО</p>
            <h2 id="booking-title">Час до кіно!</h2>
            <p>Квитки надіслано на <strong>{booking.email}</strong></p>
            <div className="ticket-summary">
              <span>{showtime.movie.title}</span>
              <span>{showtime.date} · {showtime.time}</span>
              <span>Місця: {booking.seats.join(', ')}</span>
              <strong>Код бронювання: {booking.code}</strong>
            </div>
            <button className="primary-button full-button" onClick={onClose}>Чудово</button>
          </div>
        ) : (
          <>
            <div className="modal-heading">
              <p className="eyebrow">ОБЕРІТЬ МІСЦЯ</p>
              <h2 id="booking-title">{showtime.movie.title}</h2>
              <p>{showtime.date} · {showtime.time} · {showtime.format} · {showtime.room}</p>
            </div>
            <div className="screen-label"><span /> ЕКРАН <span /></div>
            {loadingSeats ? (
              <div className="seat-loading">Завантажуємо схему залу…</div>
            ) : (
              <div className="seat-map" aria-label="Схема залу">
                {SEAT_ROWS.map((row) => (
                  <div className="seat-row" key={row}>
                    <span className="row-label">{row}</span>
                    {Array.from({ length: SEATS_PER_ROW }, (_, index) => {
                      const seat = `${row}${index + 1}`
                      const isBooked = bookedSeats.includes(seat)
                      const isSelected = selectedSeats.includes(seat)
                      return (
                        <button
                          key={seat}
                          className={`seat${isBooked ? ' booked' : ''}${isSelected ? ' selected' : ''}`}
                          disabled={isBooked}
                          onClick={() => toggleSeat(seat)}
                          aria-label={`Ряд ${row}, місце ${index + 1}${isBooked ? ', зайняте' : isSelected ? ', обране' : ''}`}
                          aria-pressed={isSelected}
                        />
                      )
                    })}
                    <span className="row-label">{row}</span>
                  </div>
                ))}
                <div className="seat-legend">
                  <span><i className="legend-seat" /> Вільне</span>
                  <span><i className="legend-seat selected" /> Обране</span>
                  <span><i className="legend-seat booked" /> Зайняте</span>
                </div>
              </div>
            )}
            <form className="booking-form" onSubmit={handleSubmit}>
              <div className="booking-total">
                <div><strong>{selectedSeats.length ? selectedSeats.join(', ') : 'Оберіть місця'}</strong><span>{showtime.price} ₴ / квиток</span></div>
                <strong>{total} ₴</strong>
              </div>
              <div className="contact-fields">
                <label>
                  Ваше ім’я
                  <input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} required minLength="2" maxLength="80" placeholder="Наприклад, Олена" />
                </label>
                <label>
                  Електронна пошта
                  <input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} required maxLength="254" placeholder="name@email.com" />
                </label>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button full-button" type="submit" disabled={!selectedSeats.length || loadingSeats || !seatsLoaded || submitting}>
                {submitting ? 'Бронюємо…' : 'Забронювати квитки'}
              </button>
              <p className="demo-note">Оплата онлайн поки недоступна — це демо-бронювання.</p>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

function TicketsPage() {
  const [email, setEmail] = useState('')
  const [tickets, setTickets] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSearched(false)
    try {
      const result = await request(`/api/bookings?email=${encodeURIComponent(email.trim())}`)
      setTickets(result.bookings)
      setSearched(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="tickets-page">
      <p className="eyebrow">ВАШІ ВЕЧОРИ У КІНО</p>
      <h1>Мої квитки</h1>
      <p className="tickets-intro">Введіть пошту, яку вказали під час бронювання, щоб знайти свої квитки.</p>
      <form className="ticket-search" onSubmit={handleSubmit}>
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Електронна пошта" aria-label="Електронна пошта" />
        <button className="primary-button" disabled={loading}>{loading ? 'Шукаємо…' : 'Знайти квитки'}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {searched && tickets.length === 0 && <div className="empty-state">За цією поштою квитків поки немає.</div>}
      {tickets.length > 0 && (
        <div className="ticket-results">
          {tickets.map((ticket) => (
            <article className="saved-ticket" key={ticket.code}>
              <div>
                <p className="eyebrow">КОД {ticket.code}</p>
                <h2>{ticket.movieTitle}</h2>
                <p>{ticket.date} · {ticket.time} · {ticket.room}</p>
                <p>Місця: {ticket.seats.join(', ')}</p>
              </div>
              <strong>{ticket.total} ₴</strong>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

function App() {
  const dateOptions = useMemo(() => getDateOptions(), [])
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value)
  const [movies, setMovies] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('Усі')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState('home')
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    request(`/api/movies?date=${selectedDate}`)
      .then((result) => {
        if (active) {
          setMovies(result.movies)
          setError('')
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [selectedDate, refreshKey])

  const filteredMovies = movies.filter((movie) => {
    const matchesGenre = selectedGenre === 'Усі' || movie.genre === selectedGenre
    const matchesSearch = `${movie.title} ${movie.genre}`.toLowerCase().includes(search.toLowerCase())
    return matchesGenre && matchesSearch
  })
  const featuredMovie = movies[0]

  function navigate(nextPage) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectDate(date) {
    if (date === selectedDate) return
    setLoading(true)
    setError('')
    setSelectedDate(date)
  }

  function refreshMovies() {
    setLoading(true)
    setError('')
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="app-shell" id="home">
      <Header page={page} onNavigate={navigate} />
      {page === 'tickets' ? (
        <TicketsPage />
      ) : (
        <main>
          {featuredMovie && (
            <section className="hero">
              <img className="hero-image" src={featuredMovie.backdrop} alt="" />
              <div className="hero-shade" />
              <div className="hero-content">
                <div className="hero-kicker"><span /> КІНО, ЯКЕ ЗАЛИШАЄТЬСЯ З ТОБОЮ</div>
                <p className="hero-label">ПРЕМ’ЄРА ТИЖНЯ</p>
                <h1>{featuredMovie.title}</h1>
                <p className="hero-description">{featuredMovie.description}</p>
                <div className="hero-details">
                  <span>★ {featuredMovie.rating}</span>
                  <span>{featuredMovie.genre}</span>
                  <span>{featuredMovie.duration} хв</span>
                  <span>{featuredMovie.ageRating}</span>
                </div>
                <button className="primary-button hero-button" onClick={() => document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })}>
                  Обрати сеанс <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="hero-caption">ВЕЛИКІ ІСТОРІЇ — НА ВЕЛИКОМУ ЕКРАНІ</div>
            </section>
          )}

          <section className="movies-section" id="movies">
            <div className="section-heading">
              <div>
                <p className="eyebrow">НЕ ПРОПУСТИ СВОЮ ІСТОРІЮ</p>
                <h2>Зараз у кіно</h2>
              </div>
              <label className="search-field">
                <span aria-hidden="true">⌕</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Знайти фільм" aria-label="Знайти фільм" />
              </label>
            </div>
            <div className="date-picker" aria-label="Оберіть дату">
              {dateOptions.map((date) => (
                <button
                  key={date.value}
                  className={selectedDate === date.value ? 'date-option active' : 'date-option'}
                  onClick={() => selectDate(date.value)}
                  aria-pressed={selectedDate === date.value}
                >
                  <span>{date.weekday}</span><strong>{date.day}</strong>
                </button>
              ))}
            </div>
            <div className="filter-row">
              <div className="genre-filters" aria-label="Фільтр за жанром">
                {GENRES.map((genre) => (
                  <button key={genre} className={selectedGenre === genre ? 'genre-chip active' : 'genre-chip'} onClick={() => setSelectedGenre(genre)}>
                    {genre}
                  </button>
                ))}
              </div>
              <span className="cinema-label"><span className="location-dot" /> Київ · КіноКадр</span>
            </div>
            {error && <div className="error-state" role="alert">{error} Переконайтеся, що сервер запущений, і <button onClick={refreshMovies}>спробуйте ще раз</button>.</div>}
            {loading ? (
              <div className="loading-state">Завантажуємо афішу…</div>
            ) : !error && filteredMovies.length > 0 ? (
              <div className="movie-grid">
                {filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} onSelectShowtime={setSelectedShowtime} />)}
              </div>
            ) : !error ? (
              <div className="empty-state">Фільмів за вашим запитом не знайдено.</div>
            ) : null}
          </section>

          <section className="experience-section" id="about">
            <div className="experience-mark" aria-hidden="true">К</div>
            <div>
              <p className="eyebrow">ТРОХИ БІЛЬШЕ, НІЖ ПРОСТО КІНО</p>
              <h2>Твій вечір починається тут.</h2>
              <p>Зручні крісла, великий екран і попкорн, який чути навіть у фінальних титрах.</p>
            </div>
            <a href="#movies">Обрати фільм <span aria-hidden="true">→</span></a>
          </section>
        </main>
      )}
      <footer className="site-footer">
        <a className="brand footer-brand" href="#home" onClick={() => navigate('home')}>
          <span className="brand-mark" aria-hidden="true">К</span>
          <span>КІНО<span className="brand-accent">КАДР</span></span>
        </a>
        <span>© {new Date().getFullYear()} КіноКадр. Створено для вечорів, що запам’ятовуються.</span>
        <a href="mailto:hello@kinokadr.ua">Написати нам</a>
      </footer>
      {selectedShowtime && (
        <BookingModal
          showtime={selectedShowtime}
          onClose={() => setSelectedShowtime(null)}
          onBooked={() => { setLoading(true); setRefreshKey((key) => key + 1) }}
        />
      )}
    </div>
  )
}

export default App

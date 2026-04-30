import { useSearchParams } from 'react-router-dom'

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const GENDERS = [
  { value: '', label: 'All' },
  { value: 'mens', label: 'Mens' },
  { value: 'womens', label: 'Womens' },
  { value: 'coed', label: 'Coed' },
]

export default function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams()

  const month = searchParams.get('month') ?? ''
  const gender = searchParams.get('gender') ?? ''

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (e.target.value) {
        next.set('month', e.target.value)
      } else {
        next.delete('month')
      }
      return next
    })
  }

  function handleGenderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (e.target.value) {
        next.set('gender', e.target.value)
      } else {
        next.delete('gender')
      }
      return next
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-month"
          className="text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Month
        </label>
        <select
          id="filter-month"
          value={month}
          onChange={handleMonthChange}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
        >
          {MONTHS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-gender"
          className="text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Division Gender
        </label>
        <select
          id="filter-gender"
          value={gender}
          onChange={handleGenderChange}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
        >
          {GENDERS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

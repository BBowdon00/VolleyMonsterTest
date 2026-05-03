import { Users, Trophy, Sun } from 'lucide-react'

const valueProps = [
  {
    icon: Users,
    title: 'All Skill Levels',
    description:
      'From beginners to competitive players — we have divisions for every ability, so everyone can compete.',
  },
  {
    icon: Trophy,
    title: 'Coed & Single-Gender',
    description:
      'Choose from coed, mens, and womens divisions. Play with your friends or your dedicated squad.',
  },
  {
    icon: Sun,
    title: 'Olney, MD All Summer',
    description:
      'Outdoor grass volleyball tournaments running all summer long right here in Olney, Maryland.',
  },
]

export default function ValuePropsSection() {
  return (
    <section className="bg-gray-50 pt-20">
      <div className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-12 text-center text-3xl font-black text-gray-900 sm:text-4xl">
          Why Volley Monster?
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {valueProps.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="group relative flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/70 transition hover:-translate-y-1 hover:shadow-lg hover:ring-teal-300"
            >
              <span className="absolute right-6 top-6 text-xs font-bold tracking-[0.2em] text-gray-300">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-md shadow-teal-500/30">
                <Icon size={28} aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="block h-8 w-full sm:h-12"
        aria-hidden="true"
      >
        <path fill="#ffffff" d="M0,30 C360,60 720,0 1440,40 L1440,60 L0,60 Z" />
      </svg>
    </section>
  )
}

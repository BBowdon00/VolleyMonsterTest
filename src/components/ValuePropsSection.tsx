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
      'Outdoor beach volleyball tournaments running all summer long right here in Olney, Maryland.',
  },
]

export default function ValuePropsSection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-12 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          Why Volley Monster?
        </h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {valueProps.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                <Icon size={28} aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

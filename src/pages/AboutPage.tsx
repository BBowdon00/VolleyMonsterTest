import { Mail, Instagram, Facebook } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900">
        About <span className="text-teal-500">Volley</span>
        <span className="text-flame-500">Monster</span>
      </h1>
      <p className="mt-4 text-lg text-gray-700 leading-relaxed">
        Volley Monster organizes outdoor volleyball tournaments all summer long in the Olney, MD area.
        Whether you're competing at the Open level or just getting started, we have a division for
        you — and a great time guaranteed.
      </p>
      <p className="mt-4 text-gray-600 leading-relaxed">
        All events are held at our primary venue at 16915 Batchellors Forest Road, Olney, MD 20832.
        We also host the annual{' '}
        <strong>Carolyn Clark Volleyball Classic</strong> at Frederick Community College — a
        charity tournament supporting women pursuing careers in fire sciences.
      </p>

      <h2 className="mt-10 text-xl font-bold text-gray-900">Contact us</h2>
      <div className="mt-4 flex flex-col gap-3">
        <a
          href="mailto:info@volleymonster.com"
          className="flex items-center gap-2 text-teal-600 hover:underline"
        >
          <Mail size={16} />
          info@volleymonster.com
        </a>
        <a
          href="https://www.instagram.com/the_volley_monster/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-teal-600 hover:underline"
        >
          <Instagram size={16} />
          @the_volley_monster
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=100088432883364"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-teal-600 hover:underline"
        >
          <Facebook size={16} />
          Volley Monster on Facebook
        </a>
      </div>
    </div>
  )
}

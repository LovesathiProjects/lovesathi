import Link from "next/link"
import { ArrowLeft, Heart } from "lucide-react"

type LegalSection = {
  title: string
  body: string
}

interface LegalPageProps {
  eyebrow: string
  title: string
  description: string
  sections: LegalSection[]
}

export function LegalPage({ eyebrow, title, description, sections }: LegalPageProps) {
  return (
    <main className="luxe-light-page min-h-screen px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-10 flex items-center justify-between rounded-full border border-[#482b1a]/10 bg-[#fffaf2]/76 px-4 py-3 shadow-sm backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3 text-[#18110d] no-underline">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8f001c] text-[#fffaf2]">
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-[-0.05em]">Lovesathi</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#8f001c]">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </nav>

        <section className="luxe-card rounded-[2.5rem] p-6 sm:p-10">
          <p className="luxe-kicker mb-4 text-[#8f001c]">{eyebrow}</p>
          <h1 className="font-serif text-5xl font-bold tracking-[-0.055em] text-[#18110d] sm:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#6c5a4a]">{description}</p>
          <p className="mt-5 rounded-2xl border border-[#b9904d]/24 bg-[#fffaf2]/72 p-4 text-sm leading-6 text-[#6c5a4a]">
            This page is product-ready placeholder copy and should be reviewed by qualified legal counsel before launch approval.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[1.7rem] border border-[#482b1a]/10 bg-[#fffaf2]/78 p-6 shadow-sm backdrop-blur">
              <h2 className="font-serif text-3xl font-bold tracking-[-0.04em] text-[#18110d]">{section.title}</h2>
              <p className="mt-3 leading-8 text-[#6c5a4a]">{section.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

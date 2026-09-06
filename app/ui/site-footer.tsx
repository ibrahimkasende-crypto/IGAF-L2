export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#d7e5ed] bg-white/95 px-4 py-6 text-center">
      <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-600">
        Un cadeau signé IKAS DEV. Pour plus d’informations ou pour nous contacter, rendez-vous sur{" "}
        <a
          href="https://newsystemcorps.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#0879b7] underline decoration-[#e5c443] decoration-2 underline-offset-4 hover:text-[#07547f] hover:decoration-[#b48b08]"
        >
          newsystemcorps.com
        </a>
        .
      </p>
    </footer>
  );
}

export default function AuthFooter() {
  return (
    <footer className="w-full mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6 text-xs text-gray-400">

        <div className="flex flex-col lg:flex-row justify-between gap-6">
          {/* Left: description */}
          <p className="max-w-3xl leading-relaxed">
            This project is a learning-focused clone of the Exness trading platform,
            built to understand how an end-to-end web-based trading system works —
            from order placement to execution logic and real-time price handling.
          </p>
    
          <span className="text-right">
            © 2026 Exness Clone. Vinit Motghare
          </span>
        </div>

      </div>
    </footer>
  );
}

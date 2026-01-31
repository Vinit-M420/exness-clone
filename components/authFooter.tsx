export default function AuthFooter() {
  return (
    <footer className="w-full mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8 flex md:flex-col gap-6 text-xs text-gray-400">

        <div className="flex flex-col lg:flex-row justify-between items-top gap-8">
          
          {/* Left: Project description */}
          <div className="max-w-3xl space-y-3 leading-relaxed ">
            <p>
              This website is a learning-focused clone inspired by the Exness trading platform.
              It is built to understand how an end-to-end CFD trading system works, including
              order placement, execution logic, and real-time price handling.
            </p>

            <p>
              No real money is used and no real market orders are executed.
              All trades are simulated for educational purposes only and do not
              constitute financial services, investment advice, or trading recommendations.
            </p>
          </div>

          {/* Right: Copyright */}
          <div>
            <span>
              © 2026 Exness Clone. Vinit Motghare
            </span>
          </div>

        </div>

      </div>
    </footer>
  );
}

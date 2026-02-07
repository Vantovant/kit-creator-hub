import Link from "next/link";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative bg-white py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Content */}
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif leading-tight mb-6">
              Email marketing that automates your growth
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Stop juggling complex marketing tasks when you could be writing, teaching, and creating. Kit automates your email marketing so{" "}
              <strong className="text-black">you can get back to doing what you love.</strong>
            </p>
            <Link
              href="#"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
            >
              Start free trial
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              14-day free trial. No credit card required. Free migrations.
            </p>
          </div>

          {/* Right side - Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#E8E4DF] to-[#D4CFC8]">
              <Image
                src="https://ext.same-assets.com/6076700/2121339779.avif"
                alt="Ali Abdaal using Kit"
                width={600}
                height={500}
                className="w-full h-auto object-cover"
              />
              {/* Floating UI elements */}
              <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg p-3 animate-float">
                <div className="text-sm font-medium">Ali Abdaal</div>
              </div>
              <div className="absolute top-20 right-8 flex gap-1">
                <span className="bg-[#5CC5DE] text-black text-xs px-2 py-1 rounded-full">Feel</span>
                <span className="bg-[#7BC47F] text-black text-xs px-2 py-1 rounded-full">Good</span>
              </div>
              <div className="absolute bottom-20 right-4 bg-[#E8B86D] text-black text-xs px-3 py-2 rounded-lg font-medium">
                Productivity
              </div>
              {/* Trust badge */}
              <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-3 rounded-xl">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Trusted By</p>
                <p className="text-sm font-medium">Ali Abdaal</p>
                <p className="text-xs text-gray-400">Productivity expert and New York Times bestselling author</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

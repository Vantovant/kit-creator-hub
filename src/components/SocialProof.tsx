import Image from "next/image";
import Link from "next/link";

const creators = [
  {
    name: "Shane Parrish",
    role: "New York Times bestselling author and newsletter writer",
    image: "https://ext.same-assets.com/6076700/3924592874.avif",
  },
  {
    name: "Maya Krampf",
    role: "Bestselling author, founder of food blog Wholesome Yum",
    image: "https://ext.same-assets.com/6076700/2047933.avif",
  },
  {
    name: "Matthew McConaughey",
    role: "Founder of Lyrics of Livin newsletter",
    image: "https://ext.same-assets.com/6076700/776525179.avif",
  },
  {
    name: "Nicole Walters",
    role: "New York Times bestselling author, Emmy nominated producer, and CEO",
    image: "https://ext.same-assets.com/6076700/2136562437.avif",
  },
  {
    name: "Ali Abdaal",
    role: "Ex-doctor turned Productivity Expert, YouTuber, bestselling author, and entrepreneur",
    image: "https://ext.same-assets.com/6076700/2121339779.avif",
  },
];

export function SocialProof() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-center mb-4">
          Thousands of <span className="text-[#5CC5DE]">authors</span>
          <br />
          use Kit to grow their business
        </h2>

        {/* Creator carousel */}
        <div className="mt-12 overflow-hidden">
          <div className="flex gap-6 animate-scroll">
            {creators.map((creator) => (
              <div
                key={creator.name}
                className="flex-shrink-0 w-48 text-center"
              >
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 bg-gray-100">
                  <Image
                    src={creator.image}
                    alt={creator.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-medium text-sm mb-1">{creator.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{creator.role}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-600 mt-12 max-w-2xl mx-auto">
          For over a decade Kit is the platform experts use to scale their knowledge,
          serve their community, and grow their revenue without burnout.
        </p>

        <div className="text-center mt-8">
          <Link
            href="#"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
          >
            Start free trial
          </Link>
          <p className="mt-3 text-sm text-gray-500">No credit card required</p>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Grow your email list, not your to-do list",
    description:
      "Your expertise deserves a bigger audience. Reach more people and grow your list on autopilot with",
    highlight: "no-code landing pages, opt-in forms, and newsletter recommendations.",
    image: "https://ext.same-assets.com/6076700/3748869667.avif",
    bgColor: "bg-[#E6F4F7]",
  },
  {
    title: "Sell more without being salesy",
    description:
      "Kit's tags and segments help you organize your audience based on their interests so the",
    highlight: "right people get the right message at the right time.",
    image: "https://ext.same-assets.com/6076700/3335240049.webp",
    bgColor: "bg-[#F8F0FF]",
  },
  {
    title: "Build once, benefit forever",
    description:
      "Automations welcome new subscribers, nurture relationships, and",
    highlight: "drive sales 24/7.",
    subtext: "It's like having another \"you\" in your business.",
    image: "https://ext.same-assets.com/6076700/4208818517.webp",
    bgColor: "bg-[#F5F5F0]",
  },
  {
    title: "Keep your audience, no matter what",
    description:
      "Algorithms change. Platforms disappear. Your email list stays with you.",
    highlight: "Build on land you own,",
    subtext: "not land you rent.",
    image: "https://ext.same-assets.com/6076700/938275629.avif",
    bgColor: "bg-white",
    hasStats: true,
  },
  {
    title: "Reach more people with every email",
    description: "With an industry-leading",
    highlight: "99.8% deliverability rate and average open rates above 40%,",
    subtext: "your carefully crafted emails land in inboxes, not spam folders.",
    image: "https://ext.same-assets.com/6076700/630854092.webp",
    bgColor: "bg-[#FFF5E6]",
  },
];

export function FeaturesDeepDive() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif max-w-xl">
            Focus on what you love, automate more with Kit
          </h2>
          <Link
            href="#features"
            className="mt-4 lg:mt-0 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50 transition-colors"
          >
            Jump to features
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </Link>
        </div>

        <div className="space-y-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className={`rounded-2xl overflow-hidden ${feature.bgColor} p-8`}>
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={500}
                    height={350}
                    className="w-full h-auto rounded-xl"
                  />
                </div>
              </div>
              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-lg">
                  {feature.description}{" "}
                  <strong className="text-black">{feature.highlight}</strong>
                  {feature.subtext && ` ${feature.subtext}`}
                </p>
                {index === 0 && (
                  <div className="mt-6">
                    <Link
                      href="#"
                      className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
                    >
                      Start free trial
                    </Link>
                    <p className="mt-3 text-sm text-gray-500">No credit card required</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
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

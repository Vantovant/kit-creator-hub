import Image from "next/image";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";

const mainApps = [
  {
    name: "Shopify",
    description: "Grow Your Creator Business, Automate Your Marketing, and Drive More Sales",
    image: "https://ext.same-assets.com/6076700/1256387053.png",
    color: "bg-[#95BF47]",
  },
  {
    name: "Canva",
    description: "Get access to your Canva library natively within the Kit media gallery",
    image: "https://ext.same-assets.com/6076700/3919102039.png",
    color: "bg-[#00C4CC]",
  },
  {
    name: "Circle",
    description: "Connect Kit with your Circle Community.",
    image: "https://ext.same-assets.com/6076700/2836203395.png",
    color: "bg-[#5C5CFF]",
  },
  {
    name: "GIPHY",
    description: "Get access to the world's largest library of free GIFs, Clips, & Stickers.",
    image: "https://ext.same-assets.com/6076700/933665161.png",
    color: "bg-black",
  },
];

const smallApps = [
  {
    name: "SavvyCal",
    description: "Embed beautiful booking links in your Kit emails...",
    icon: "https://ext.same-assets.com/6076700/3310808607.png",
  },
  {
    name: "Custom Fonts",
    description: "Use custom fonts in your emails by dynamically...",
    icon: "https://ext.same-assets.com/6076700/2010169395.png",
  },
  {
    name: "Lex",
    description: "Write something great today. We'll analyze your...",
    icon: "https://ext.same-assets.com/6076700/4034075972.png",
  },
  {
    name: "Senja",
    description: "Add your text and video testimonials to your Kit...",
    icon: "https://ext.same-assets.com/6076700/1218862441.png",
  },
  {
    name: "Sponsy",
    description: "Connect your ad inventory from Sponsy...",
    icon: "https://ext.same-assets.com/6076700/916622601.png",
  },
  {
    name: "Transistor.fm",
    description: "Embed great-looking podcast players into your...",
    icon: "https://ext.same-assets.com/6076700/3104910468.png",
  },
  {
    name: "Linktree",
    description: "Sync contact lists seamlessly between...",
    icon: "https://ext.same-assets.com/6076700/308959329.jpeg",
  },
  {
    name: "Thinkific",
    description: "Create online courses, digital products, and...",
    icon: "https://ext.same-assets.com/6076700/2054383508.png",
  },
];

export function AppIntegrations() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-4">
              Smart apps that connect your creator tools directly to Kit
            </h2>
            <Link
              href="#"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
            >
              Start free trial
            </Link>
            <p className="mt-3 text-sm text-gray-500">No credit card required</p>
          </div>
          <p className="mt-6 lg:mt-0 text-gray-600 max-w-sm">
            Your personalized hub for streamlining your business and creative workflows.
          </p>
        </div>

        {/* Main app cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {mainApps.map((app) => (
            <div
              key={app.name}
              className="group rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className={`h-32 ${app.color} relative`}>
                <Image
                  src={app.image}
                  alt={app.name}
                  width={300}
                  height={150}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium mb-2">{app.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{app.description}</p>
                <button
                  type="button"
                  className="mt-4 w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Small app list */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {smallApps.map((app) => (
            <div
              key={app.name}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Image
                src={app.icon}
                alt={app.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-medium text-sm">{app.name}</h4>
                <p className="text-xs text-gray-500 line-clamp-2">{app.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-right">
          <Link
            href="#"
            className="inline-flex items-center gap-2 text-sm font-medium hover:text-[#5CC5DE] transition-colors"
          >
            See all apps
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

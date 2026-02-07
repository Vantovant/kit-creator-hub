import Image from "next/image";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "When I first announced the book on Instagram, it had a little bump in pre-order numbers, but when",
    highlight: "I sent an email to my list using Kit—that's when we started to see some real movement.",
    author: "Nisha Vora",
    role: "NYT bestselling author of Big Vegan Flavor",
    image: "https://ext.same-assets.com/6076700/2635341858.avif",
  },
  {
    quote: "Kit is integral because it's the",
    highlight: "hub of the business.",
    author: "Eddie Shleyner",
    role: "Author of Very Good Copy",
    image: "https://ext.same-assets.com/6076700/724620122.avif",
  },
  {
    quote:
      "Thanks to the fact that we sell our own product through our email list now, I have",
    highlight: "the freedom to live, learn, and teach on my own terms,",
    suffix: "which is the thing I care about.",
    author: "Ali Abdaal",
    role: "NYT bestselling author of Feel-Good Productivity",
    image: "https://ext.same-assets.com/6076700/2834135402.avif",
  },
  {
    quote:
      "It's built for creators. You can tell when you're using the platform that",
    highlight: "they want you to make money from your email list,",
    suffix: "and they want to make it as easy as possible for someone who's not super technical.",
    author: "Terry Rice",
    role: "Podcaster, consultant, and author",
    image: "https://ext.same-assets.com/6076700/878965684.avif",
  },
  {
    quote:
      "Our business would NOT exist without Kit. In fact,",
    highlight: "we wouldn't be Sunday Times bestsellers of our book, Financial Joy, without Kit.",
    author: "Ken & Mary Okoroafor",
    role: "Bestselling authors and founders of The Humble Penny",
    image: "https://ext.same-assets.com/6076700/3902389553.avif",
  },
  {
    quote: "",
    highlight: "22,000 subscribers have come from Recommendations",
    suffix: "and it is one of the best things that has ever happened to my newsletter.",
    author: "Dan Go",
    role: "High performance coach",
    image: "https://ext.same-assets.com/6076700/2052417034.avif",
  },
  {
    quote: "I like that",
    highlight: "Kit is intuitive",
    suffix: "and I can do things myself; it makes me feel closer to my business.",
    author: "Dorie Clark",
    role: "Wall Street Journal and USA Today bestselling author of The Long Game",
    image: "https://ext.same-assets.com/6076700/2710548879.avif",
  },
  {
    quote: "Even more than social, email is the way.",
    highlight: "Kit is more central to me than any publication.",
    author: "Ryan Holiday",
    role: "NYT bestselling author of The Daily Stoic",
    image: "https://ext.same-assets.com/6076700/381454878.avif",
  },
  {
    quote:
      "We recently launched a new onboarding sequence to identify pain points and have a targeted welcome sequence based on those pain points. It's been hugely successful.",
    highlight: "We saw a 30 percent growth in the sale of the two products",
    suffix: "we feature in those sequences over the last three months.",
    author: "Katelyn Bourgoin",
    role: "Founder of the Why We Buy newsletter",
    image: "https://ext.same-assets.com/6076700/108842268.avif",
  },
];

function StarRating() {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star key={`star-${i + 1}`} className="w-4 h-4 fill-[#E8B86D] text-[#E8B86D]" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-center mb-16">
          Experts use Kit to build
          <br />
          relationships and revenue
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <Quote className="w-6 h-6 text-gray-300" />
                <StarRating />
              </div>
              <p className="text-gray-700 mb-6">
                {testimonial.quote}{" "}
                <strong className="text-black">{testimonial.highlight}</strong>
                {testimonial.suffix && ` ${testimonial.suffix}`}
              </p>
              <div className="flex items-center gap-3">
                <Image
                  src={testimonial.image}
                  alt={testimonial.author}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-sm">{testimonial.author}</p>
                  <p className="text-xs text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

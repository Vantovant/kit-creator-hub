interface HostedImageProps {
  src: string;
  alt: string;
}

export default function HostedImage({ src, alt }: HostedImageProps) {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-white p-4">
      <h1 className="sr-only">{alt}</h1>
      <img src={src} alt={alt} className="max-w-full h-auto" />
    </main>
  );
}

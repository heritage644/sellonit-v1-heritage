import Image from 'next/image';

export default function Navbar() {
  return (
    <>
      <nav>
        <div>
          {' '}
          <Image
            src="/logo/Wordmark SVG (1) 1.svg"
            alt="Sellonit"
            width={160}
            height={36}
            unoptimized
          />
        </div>
      </nav>
    </>
  );
}

import { useEffect, useState } from "react";
import { getPublicSourcingPhotos, type SourcingPhotoPayload } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";

const CATEGORY_LABEL: Record<SourcingPhotoPayload["category"], string> = {
  fishing: "Fishing",
  sourcing: "Sourcing",
  cutting: "Cutting"
};

const HomeSourcingGallery = () => {
  const [photos, setPhotos] = useState<SourcingPhotoPayload[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPublicSourcingPhotos()
      .then((res) => {
        if (!cancelled) setPhotos(res.photos || []);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (photos.length === 0) return null;

  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-cyan-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-cyan-950">From boat to board</h2>
          <div className="w-24 h-1.5 bg-gradient-to-r from-teal-400 to-cyan-500 mx-auto mt-6 rounded-full" />
          <p className="text-cyan-700 mt-4 max-w-2xl mx-auto">
            How we source, cut, and handle your fish — photos from our team.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {photos.map((p) => (
            <figure
              key={p._id}
              className="relative rounded-2xl overflow-hidden bg-cyan-950 aspect-[4/3] shadow-md group"
            >
              <img
                src={mediaUrl(p.imageUrl)}
                alt={p.caption || CATEGORY_LABEL[p.category]}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cyan-950/90 to-transparent p-3 text-white">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-300">
                  {CATEGORY_LABEL[p.category]}
                </span>
                {p.caption ? <p className="text-sm font-medium leading-snug mt-0.5">{p.caption}</p> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeSourcingGallery;

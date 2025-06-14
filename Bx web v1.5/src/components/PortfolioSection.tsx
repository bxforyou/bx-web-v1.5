import React, { useState, useEffect } from 'react';
import { PortfolioItem, Category, SiteContent } from '../types';

interface PortfolioSectionProps {
  portfolio: PortfolioItem[];
  categories: Category[];
  content: SiteContent;
}

const PortfolioSection: React.FC<PortfolioSectionProps> = ({ portfolio, categories, content }) => {
  const [currentSlides, setCurrentSlides] = useState<{ [key: string]: number }>({});
  const [isPaused, setIsPaused] = useState<{ [key: string]: boolean }>({});
  const [imageDimensions, setImageDimensions] = useState<{ [key: string]: { width: number; height: number; aspectRatio: number; isLoaded: boolean } }>({});

  const getItemsByCategory = (categorySlug: string) => {
    return portfolio.filter(item => item.category === categorySlug);
  };

  const getSliderSpeed = () => {
    return content.sliderSettings?.speed || 4000;
  };

  const isAutoPlayEnabled = () => {
    return content.sliderSettings?.autoPlay !== false;
  };

  const isPauseOnHoverEnabled = () => {
    return content.sliderSettings?.pauseOnHover !== false;
  };

  // Enhanced image dimension loading with better error handling
  const loadImageDimensions = (imageUrl: string, itemId: string) => {
    if (imageDimensions[itemId]?.isLoaded) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setImageDimensions(prev => ({
        ...prev,
        [itemId]: {
          width: img.width,
          height: img.height,
          aspectRatio,
          isLoaded: true
        }
      }));
    };
    
    img.onerror = () => {
      // Fallback dimensions if image fails to load
      setImageDimensions(prev => ({
        ...prev,
        [itemId]: {
          width: 400,
          height: 400,
          aspectRatio: 1,
          isLoaded: true
        }
      }));
    };
    
    img.src = imageUrl;
  };

  // Load dimensions for all images
  useEffect(() => {
    portfolio.forEach(item => {
      if (item.image && !imageDimensions[item.id]?.isLoaded) {
        loadImageDimensions(item.image, item.id);
      }
    });
  }, [portfolio]);

  // Enhanced dynamic sizing with better responsiveness
  const getOptimalContainerStyle = (itemId: string) => {
    const dimensions = imageDimensions[itemId];
    if (!dimensions?.isLoaded) {
      return {
        aspectRatio: '1 / 1',
        minHeight: '250px',
        maxHeight: '400px'
      };
    }
    
    const { aspectRatio, width, height } = dimensions;
    
    // Calculate optimal dimensions based on image aspect ratio
    let containerAspectRatio = aspectRatio;
    let minHeight = 200;
    let maxHeight = 500;
    
    // Adjust for different image types
    if (aspectRatio > 2) {
      // Very wide images (panoramic)
      containerAspectRatio = 2;
      maxHeight = 300;
    } else if (aspectRatio > 1.5) {
      // Wide images (landscape)
      containerAspectRatio = aspectRatio;
      maxHeight = 350;
    } else if (aspectRatio < 0.6) {
      // Very tall images (portrait)
      containerAspectRatio = 0.75;
      maxHeight = 600;
    } else if (aspectRatio < 0.9) {
      // Tall images
      containerAspectRatio = aspectRatio;
      maxHeight = 450;
    } else {
      // Square-ish images
      containerAspectRatio = aspectRatio;
      maxHeight = 400;
    }
    
    return {
      aspectRatio: `${containerAspectRatio} / 1`,
      minHeight: `${minHeight}px`,
      maxHeight: `${maxHeight}px`,
      width: '100%'
    };
  };

  // Get image type for display
  const getImageType = (itemId: string) => {
    const dimensions = imageDimensions[itemId];
    if (!dimensions?.isLoaded) return 'Loading...';
    
    const { aspectRatio } = dimensions;
    
    if (aspectRatio > 2) return 'Panoramic';
    if (aspectRatio > 1.5) return 'Landscape';
    if (aspectRatio < 0.6) return 'Portrait';
    if (aspectRatio < 0.9) return 'Tall';
    return 'Square';
  };

  // Determine if category should move in reverse direction (right to left)
  const isReverseDirection = (categoryIndex: number) => {
    return categoryIndex % 2 === 1; // Odd indexed categories move right to left
  };

  useEffect(() => {
    if (!isAutoPlayEnabled()) return;

    const intervals: { [key: string]: NodeJS.Timeout } = {};

    categories.forEach((category, categoryIndex) => {
      const items = getItemsByCategory(category.slug);
      if (items.length > 4 && !isPaused[category.slug]) {
        const maxSlides = Math.ceil(items.length / 4);
        const isReverse = isReverseDirection(categoryIndex);
        
        intervals[category.slug] = setInterval(() => {
          setCurrentSlides(prev => {
            const currentSlide = prev[category.slug] || 0;
            let nextSlide;
            
            if (isReverse) {
              // Move backwards (right to left visual effect)
              nextSlide = currentSlide === 0 ? maxSlides - 1 : currentSlide - 1;
            } else {
              // Move forwards (left to right visual effect)
              nextSlide = (currentSlide + 1) % maxSlides;
            }
            
            return {
              ...prev,
              [category.slug]: nextSlide
            };
          });
        }, getSliderSpeed());
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [categories, portfolio, content.sliderSettings, isPaused]);

  const nextSlide = (categorySlug: string, items: PortfolioItem[], categoryIndex: number) => {
    const maxSlides = Math.ceil(items.length / 4);
    const isReverse = isReverseDirection(categoryIndex);
    
    setCurrentSlides(prev => {
      const currentSlide = prev[categorySlug] || 0;
      let nextSlide;
      
      if (isReverse) {
        nextSlide = currentSlide === 0 ? maxSlides - 1 : currentSlide - 1;
      } else {
        nextSlide = (currentSlide + 1) % maxSlides;
      }
      
      return {
        ...prev,
        [categorySlug]: nextSlide
      };
    });
  };

  const prevSlide = (categorySlug: string, items: PortfolioItem[], categoryIndex: number) => {
    const maxSlides = Math.ceil(items.length / 4);
    const isReverse = isReverseDirection(categoryIndex);
    
    setCurrentSlides(prev => {
      const currentSlide = prev[categorySlug] || 0;
      let prevSlideIndex;
      
      if (isReverse) {
        prevSlideIndex = (currentSlide + 1) % maxSlides;
      } else {
        prevSlideIndex = currentSlide === 0 ? maxSlides - 1 : currentSlide - 1;
      }
      
      return {
        ...prev,
        [categorySlug]: prevSlideIndex
      };
    });
  };

  const handleMouseEnter = (categorySlug: string) => {
    if (isPauseOnHoverEnabled()) {
      setIsPaused(prev => ({ ...prev, [categorySlug]: true }));
    }
  };

  const handleMouseLeave = (categorySlug: string) => {
    if (isPauseOnHoverEnabled()) {
      setIsPaused(prev => ({ ...prev, [categorySlug]: false }));
    }
  };

  const getSlideDirection = (categoryIndex: number) => {
    return isReverseDirection(categoryIndex) ? 'Right to Left' : 'Left to Right';
  };

  return (
    <section id="portfolio" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {categories.map((category, categoryIndex) => {
          const items = getItemsByCategory(category.slug);
          if (items.length === 0) return null;

          const currentSlide = currentSlides[category.slug] || 0;
          const maxSlides = Math.ceil(items.length / 4);
          const isReverse = isReverseDirection(categoryIndex);

          return (
            <div key={category.id} className="mb-16">
              <div className="flex items-center justify-center mb-8">
                <h2 className="text-4xl font-bold text-center text-gray-800 animate-fade-in-up" 
                    style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}>
                  {category.name}
                </h2>
                {/* Direction indicator for admin reference */}
                <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                  {getSlideDirection(categoryIndex)} • Auto-Sizing
                </div>
              </div>
              
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter(category.slug)}
                onMouseLeave={() => handleMouseLeave(category.slug)}
              >
                <div className="overflow-hidden rounded-xl shadow-lg">
                  <div
                    className={`flex transition-transform duration-1000 ease-in-out ${
                      isReverse ? 'flex-row-reverse' : ''
                    }`}
                    style={{
                      transform: isReverse 
                        ? `translateX(${currentSlide * 100}%)` 
                        : `translateX(-${currentSlide * 100}%)`
                    }}
                  >
                    {Array.from({ length: maxSlides }).map((_, slideIndex) => (
                      <div key={slideIndex} className="w-full flex-shrink-0">
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 ${
                          isReverse ? 'flex-row-reverse' : ''
                        }`}>
                          {items.slice(slideIndex * 4, (slideIndex + 1) * 4).map((item, index) => {
                            const dimensions = imageDimensions[item.id];
                            const hasLoaded = dimensions?.isLoaded || false;
                            const containerStyle = getOptimalContainerStyle(item.id);
                            
                            return (
                              <div
                                key={item.id}
                                className="relative group overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-700 transform hover:scale-105 animate-fade-in-up bg-white"
                                style={{ animationDelay: `${index * 0.1}s` }}
                              >
                                <div 
                                  className="relative overflow-hidden transition-all duration-500"
                                  style={containerStyle}
                                >
                                  <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    style={{
                                      objectFit: 'cover'
                                    }}
                                    onLoad={() => {
                                      if (!hasLoaded) {
                                        loadImageDimensions(item.image, item.id);
                                      }
                                    }}
                                  />
                                  
                                  {/* Loading indicator */}
                                  {!hasLoaded && (
                                    <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                                      <div className="text-gray-500 text-sm">Loading...</div>
                                    </div>
                                  )}
                                  
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                                    <div className="absolute bottom-4 left-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                      <h3 className="font-bold text-lg mb-1 font-sans">{item.title}</h3>
                                      <p className="text-sm opacity-90 font-medium">{category.name}</p>
                                      {hasLoaded && dimensions && (
                                        <div className="text-xs opacity-75 mt-1 space-y-1">
                                          <p>{dimensions.width} × {dimensions.height}px</p>
                                          <p>{getImageType(item.id)} • Ratio: {dimensions.aspectRatio.toFixed(2)}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                                    {category.name.toUpperCase()}
                                  </div>
                                  
                                  {/* Enhanced auto-resize indicator */}
                                  {hasLoaded && (
                                    <div className="absolute top-4 left-4 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-500">
                                      Auto-Sized • {getImageType(item.id)}
                                    </div>
                                  )}
                                  
                                  {/* Aspect ratio indicator */}
                                  {hasLoaded && dimensions && (
                                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-all duration-500">
                                      {dimensions.aspectRatio > 1 ? 'Landscape' : dimensions.aspectRatio < 1 ? 'Portrait' : 'Square'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {maxSlides > 1 && (
                  <>
                    <button
                      onClick={() => prevSlide(category.slug, items, categoryIndex)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-all duration-300 hover:scale-110 shadow-lg backdrop-blur-sm z-10"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => nextSlide(category.slug, items, categoryIndex)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-all duration-300 hover:scale-110 shadow-lg backdrop-blur-sm z-10"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {maxSlides > 1 && (
                  <div className="flex justify-center mt-8 space-x-3">
                    {Array.from({ length: maxSlides }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlides(prev => ({ ...prev, [category.slug]: index }))}
                        className={`w-4 h-4 rounded-full transition-all duration-300 ${
                          currentSlide === index 
                            ? 'bg-blue-600 scale-125 shadow-lg' 
                            : 'bg-gray-300 hover:bg-gray-400 hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Enhanced auto-play indicator with direction */}
                {isAutoPlayEnabled() && maxSlides > 1 && (
                  <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                    {isPaused[category.slug] ? 'Paused' : `Auto-playing ${isReverse ? '→←' : '←→'} • Smart Sizing`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PortfolioSection;
import React, { useState } from 'react';
import { Check, Lock, RefreshCw, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

const ProgressCarousel = () => {
  const [viewMode, setViewMode] = useState('in-progress');
  const [activeIndex, setActiveIndex] = useState(2);
  
  const illusionsInProgress = [
    { key: 'stress', name: 'Stress', status: 'completed', number: 1, daysSince: 12 },
    { key: 'pleasure', name: 'Pleasure', status: 'completed', number: 2, daysSince: 10 },
    { key: 'focus', name: 'Focus', status: 'current', number: 3 },
    { key: 'willpower', name: 'Will-power', status: 'locked', number: 4 },
    { key: 'identity', name: 'Identity', status: 'locked', number: 5 },
  ];

  const illusionsPostCeremony = [
    { key: 'stress', name: 'Stress', status: 'completed', number: 1, daysSince: 45 },
    { key: 'pleasure', name: 'Pleasure', status: 'completed', number: 2, daysSince: 43 },
    { key: 'willpower', name: 'Will-power', status: 'completed', number: 3, daysSince: 41 },
    { key: 'focus', name: 'Focus', status: 'completed', number: 4, daysSince: 39 },
    { key: 'identity', name: 'Identity', status: 'completed', number: 5, daysSince: 37 },
  ];

  const illusions = viewMode === 'in-progress' ? illusionsInProgress : illusionsPostCeremony;

  const handlePrevious = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(illusions.length - 1, prev + 1));
  };

  const handleDotClick = (index) => {
    setActiveIndex(index);
  };

  const getCircleSize = (index) => {
    const distance = Math.abs(index - activeIndex);
    if (distance === 0) return { size: 96, iconSize: 48, fontSize: '1rem' };
    if (distance === 1) return { size: 64, iconSize: 32, fontSize: '0.875rem' };
    return { size: 48, iconSize: 24, fontSize: '0.75rem' };
  };

  const getOpacity = (index) => {
    const distance = Math.abs(index - activeIndex);
    if (distance === 0) return 1;
    if (distance === 1) return 0.7;
    return 0.4;
  };

  const renderCircle = (illusion, index) => {
    const { size, iconSize, fontSize } = getCircleSize(index);
    const opacity = getOpacity(index);
    const isActive = index === activeIndex;

    return (
      <div
        key={illusion.key}
        className="flex flex-col items-center transition-all duration-500 ease-out cursor-pointer"
        style={{
          opacity,
          transform: `scale(${isActive ? 1 : 0.85})`,
          minWidth: '120px'
        }}
        onClick={() => handleDotClick(index)}
      >
        <div
          className="rounded-full flex items-center justify-center transition-all duration-500 mb-2"
          style={{
            width: size,
            height: size,
            background: illusion.status === 'completed' 
              ? 'linear-gradient(135deg, #fc4a1a, #f7b733)'
              : illusion.status === 'current'
              ? 'rgba(252, 74, 26, 0.3)'
              : 'rgba(31, 108, 117, 0.3)',
            border: illusion.status === 'current' 
              ? '2px solid #fc4a1a' 
              : illusion.status === 'locked'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : 'none'
          }}
        >
          {illusion.status === 'completed' && (
            <Check style={{ width: iconSize, height: iconSize, color: 'white' }} />
          )}
          {illusion.status === 'current' && (
            <div 
              className="w-3 h-3 rounded-full"
              style={{ background: '#fc4a1a' }}
            />
          )}
          {illusion.status === 'locked' && (
            <Lock style={{ width: iconSize, height: iconSize, color: 'rgba(255, 255, 255, 0.3)' }} />
          )}
        </div>

        <div
          className="font-semibold text-white mb-1 transition-all duration-500 text-center"
          style={{ 
            fontSize,
            color: illusion.status === 'current' ? '#fc4a1a' : 'white'
          }}
        >
          {illusion.name}
        </div>

        {illusion.status === 'completed' && (
          <button
            className="rounded-full px-3 py-1 text-xs font-medium text-white transition-all duration-300 flex items-center gap-1"
            style={{
              background: 'rgba(31, 108, 117, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              opacity: isActive ? 1 : 0.7,
              fontSize: isActive ? '0.75rem' : '0.625rem'
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <RefreshCw style={{ width: isActive ? 12 : 10, height: isActive ? 12 : 10 }} />
            Revisit
          </button>
        )}
      </div>
    );
  };

  const activeIllusion = illusions[activeIndex];

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(circle at top, #104e54 0%, #041f21 100%)',
      backgroundAttachment: 'fixed'
    }}>
      <div className="min-h-screen px-0 py-4 md:p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="px-4 md:px-0">
            <div className="inline-flex rounded-full p-1" style={{
              background: 'rgba(13, 92, 99, 0.35)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={() => {
                  setViewMode('in-progress');
                  setActiveIndex(2);
                }}
                className="px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all"
                style={{
                  background: viewMode === 'in-progress' 
                    ? 'linear-gradient(135deg, #fc4a1a, #f7b733)' 
                    : 'transparent',
                  color: 'white'
                }}
              >
                In-Progress
              </button>
              <button
                onClick={() => {
                  setViewMode('post-ceremony');
                  setActiveIndex(2);
                }}
                className="px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all"
                style={{
                  background: viewMode === 'post-ceremony' 
                    ? 'linear-gradient(135deg, #fc4a1a, #f7b733)' 
                    : 'transparent',
                  color: 'white'
                }}
              >
                Post-Ceremony
              </button>
            </div>
          </div>

          {viewMode === 'in-progress' ? (
            <>
              <div className="px-4 md:px-0">
                <div
                  className="rounded-lg md:rounded-3xl p-6 md:p-8 overflow-hidden"
                  style={{
                    background: 'rgba(13, 92, 99, 0.35)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <h2 className="text-2xl font-semibold text-white mb-2 text-center">Your Progress</h2>
                  <p className="text-white text-center mb-8" style={{ opacity: 0.65 }}>
                    {illusions.filter(i => i.status === 'completed').length} of 5 illusions explored
                  </p>

                  <div className="relative">
                    <button
                      onClick={handlePrevious}
                      disabled={activeIndex === 0}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: activeIndex === 0 ? 'rgba(31, 108, 117, 0.2)' : 'rgba(31, 108, 117, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        opacity: activeIndex === 0 ? 0.3 : 1,
                        cursor: activeIndex === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={activeIndex === illusions.length - 1}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: activeIndex === illusions.length - 1 ? 'rgba(31, 108, 117, 0.2)' : 'rgba(31, 108, 117, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        opacity: activeIndex === illusions.length - 1 ? 0.3 : 1,
                        cursor: activeIndex === illusions.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>

                    <div 
                      className="flex items-center justify-center gap-4 py-8 px-12 transition-transform duration-500 ease-out"
                      style={{
                        transform: `translateX(${-(activeIndex - 2) * 140}px)`
                      }}
                    >
                      {illusions.map((illusion, index) => renderCircle(illusion, index))}
                    </div>
                  </div>

                  <div className="flex justify-center gap-2 mt-4">
                    {illusions.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleDotClick(index)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{
                          background: index === activeIndex 
                            ? '#fc4a1a' 
                            : 'rgba(255, 255, 255, 0.2)',
                          width: index === activeIndex ? '24px' : '8px'
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    {activeIllusion.status === 'current' && (
                      <div className="text-center">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Continue: The {activeIllusion.name} Illusion
                        </h3>
                        <p className="text-white mb-4" style={{ opacity: 0.65 }}>
                          See how nicotine disrupts focus rather than enhancing it.
                        </p>
                        <button
                          className="w-full rounded-full py-3 px-6 font-semibold text-white transition-all hover:-translate-y-0.5"
                          style={{
                            background: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
                            boxShadow: '0 4px 24px rgba(252, 74, 26, 0.3)'
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    )}

                    {activeIllusion.status === 'locked' && (
                      <div className="text-center">
                        <h3 className="text-xl font-semibold text-white mb-2" style={{ opacity: 0.5 }}>
                          {activeIllusion.name} Illusion
                        </h3>
                        <p className="text-white" style={{ opacity: 0.4 }}>
                          Complete previous illusions to unlock
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Your Breakthrough Moments</h2>
                  <div className="text-sm text-white" style={{ opacity: 0.65 }}>
                    2 moments
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div
                    className="rounded-lg md:rounded-3xl p-6 transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                      background: 'rgba(13, 92, 99, 0.35)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div 
                      className="text-xs font-medium uppercase mb-3 tracking-widest"
                      style={{ 
                        color: '#fc4a1a',
                        letterSpacing: '0.35em',
                        opacity: 0.85
                      }}
                    >
                      STRESS • DAY 2
                    </div>
                    
                    <blockquote className="mb-4 text-white leading-relaxed" style={{
                      fontSize: '1.0625rem',
                      lineHeight: '1.6'
                    }}>
                      "I realized that smoking after stress doesn't actually help—it just delays my response to the problem while making me feel worse."
                    </blockquote>
                    
                    <div className="text-sm text-white mb-4" style={{ opacity: 0.5 }}>
                      January 14, 2026
                    </div>
                    
                    <button
                      className="w-full rounded-full py-3 px-6 font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
                        boxShadow: '0 4px 24px rgba(252, 74, 26, 0.3)'
                      }}
                    >
                      Reconnect with this →
                    </button>
                  </div>

                  <div
                    className="rounded-lg md:rounded-3xl p-6 transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                      background: 'rgba(13, 92, 99, 0.35)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div 
                      className="text-xs font-medium uppercase mb-3 tracking-widest"
                      style={{ 
                        color: '#fc4a1a',
                        letterSpacing: '0.35em',
                        opacity: 0.85
                      }}
                    >
                      PLEASURE • DAY 4
                    </div>
                    
                    <blockquote className="mb-4 text-white leading-relaxed" style={{
                      fontSize: '1.0625rem',
                      lineHeight: '1.6'
                    }}>
                      "The 'pleasure' was always just relief from withdrawal. I was chasing something that only existed because I was addicted."
                    </blockquote>
                    
                    <div className="text-sm text-white mb-4" style={{ opacity: 0.5 }}>
                      January 16, 2026
                    </div>
                    
                    <button
                      className="w-full rounded-full py-3 px-6 font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
                        boxShadow: '0 4px 24px rgba(252, 74, 26, 0.3)'
                      }}
                    >
                      Reconnect with this →
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="px-4 md:px-0">
                <div
                  className="rounded-lg md:rounded-3xl p-6 md:p-8"
                  style={{
                    background: 'rgba(13, 92, 99, 0.35)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <h2 className="text-2xl font-semibold text-white mb-2">Your Journey</h2>
                  <p className="text-white mb-6" style={{ opacity: 0.65 }}>
                    All 5 illusions dismantled
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {illusionsPostCeremony.map((illusion) => (
                      <button
                        key={illusion.key}
                        className="flex items-center gap-2 px-4 py-3 rounded-full transition-all hover:scale-105"
                        style={{
                          background: 'rgba(31, 108, 117, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #fc4a1a, #f7b733)'
                          }}
                        >
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-white">{illusion.name}</span>
                        <RefreshCw className="w-4 h-4 text-white ml-1" style={{ opacity: 0.7 }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Your Breakthrough Moments</h2>
                  <div className="text-sm text-white" style={{ opacity: 0.65 }}>
                    3 moments
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div
                    className="rounded-lg md:rounded-3xl p-6 transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                      background: 'rgba(13, 92, 99, 0.35)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div 
                      className="text-xs font-medium uppercase mb-3 tracking-widest"
                      style={{ 
                        color: '#fc4a1a',
                        letterSpacing: '0.35em',
                        opacity: 0.85
                      }}
                    >
                      WILLPOWER • DAY 6
                    </div>
                    
                    <blockquote className="mb-4 text-white leading-relaxed" style={{
                      fontSize: '1.0625rem',
                      lineHeight: '1.6'
                    }}>
                      "It's not about having enough willpower to resist. The whole idea that I need willpower means I still believe nicotine gives me something."
                    </blockquote>
                    
                    <div className="text-sm text-white mb-4" style={{ opacity: 0.5 }}>
                      January 18, 2026
                    </div>
                    
                    <button
                      className="w-full rounded-full py-3 px-6 font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
                        boxShadow: '0 4px 24px rgba(252, 74, 26, 0.3)'
                      }}
                    >
                      Reconnect with this →
                    </button>
                  </div>

                  <div
                    className="rounded-lg md:rounded-3xl p-6 transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                      background: 'rgba(13, 92, 99, 0.35)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div 
                      className="text-xs font-medium uppercase mb-3 tracking-widest"
                      style={{ 
                        color: '#fc4a1a',
                        letterSpacing: '0.35em',
                        opacity: 0.85
                      }}
                    >
                      FOCUS • DAY 8
                    </div>
                    
                    <blockquote className="mb-4 text-white leading-relaxed" style={{
                      fontSize: '1.0625rem',
                      lineHeight: '1.6'
                    }}>
                      "The focus I thought I got from nicotine was just my normal focus returning after withdrawal fog cleared."
                    </blockquote>
                    
                    <div className="text-sm text-white mb-4" style={{ opacity: 0.5 }}>
                      January 20, 2026
                    </div>
                    
                    <button
                      className="w-full rounded-full py-3 px-6 font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
                        boxShadow: '0 4px 24px rgba(252, 74, 26, 0.3)'
                      }}
                    >
                      Reconnect with this →
                    </button>
                  </div>

                  <div
                    className="rounded-lg md:rounded-3xl p-6 transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                      background: 'rgba(13, 92, 99, 0.35)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div 
                      className="text-xs font-medium uppercase mb-3 tracking-widest"
                      style={{ 
                        color: '#fc4a1a',
                        letterSpacing: '0.35em',
                        opacity: 0.85
                      }}
                    >
                      IDENTITY • DAY 10
                    </div>
                    
                    <blockquote className="mb-4 text-white leading-relaxed" style={{
                      fontSize: '1.0625rem',
                      lineHeight: '1.6'
                    }}>
                      "I'm not a smoker trying not to smoke. I'm someone who doesn't smoke. That's just who I am now."
                    </blockquote>
                    
                    <div className="text-sm text-white mb-4" style={{ opacity: 0.5 }}>
                      January 22, 2026
                    </div>
                    
                    <button
                      className="w-full rounded-full py-3 px-6 font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
                        boxShadow: '0 4px 24px rgba(252, 74, 26, 0.3)'
                      }}
                    >
                      Reconnect with this →
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-0">
                <div
                  className="rounded-lg md:rounded-3xl p-8"
                  style={{
                    background: 'rgba(13, 92, 99, 0.35)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold text-white mb-2">Need Support?</h2>
                    <p className="text-white" style={{ opacity: 0.65 }}>
                      Reconnect with what you've already discovered
                    </p>
                  </div>
                  
                  <button
                    className="w-full rounded-full py-4 px-6 font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
                      boxShadow: '0 4px 24px rgba(252, 74, 26, 0.3)'
                    }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Get Support Now
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="px-4 md:px-0">
            <div
              className="rounded-lg md:rounded-3xl p-6"
              style={{
                background: 'rgba(13, 92, 99, 0.25)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Complete Implementation</h3>
              <div className="space-y-3 text-sm text-white" style={{ opacity: 0.85 }}>
                <p><strong>In-Progress:</strong> Carousel with revisit badges on completed circles. Moment cards below. No duplicate CTA when completed illusion is focused.</p>
                <p><strong>Post-Ceremony:</strong> Compact chip row (Your Journey) + Moment cards + Support section. All three reinforcement entry points visible.</p>
                <p><strong>Single CTA rule:</strong> Revisit only appears as badge on circles. No duplicate large CTA below.</p>
                <p><strong>Space efficiency:</strong> Post-ceremony chip row ~60-80px vs 300px+ for vertical list.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProgressCarousel;

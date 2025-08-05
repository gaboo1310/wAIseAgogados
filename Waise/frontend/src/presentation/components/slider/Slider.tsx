import React, { useState, useRef, useEffect, MouseEvent } from "react";
import "./slider.css";

const Slider = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (sliderRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - sliderRef.current.offsetLeft);
      setScrollLeft(sliderRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    if (sliderRef.current) {
      setIsDragging(false);
      const sliderWidth = sliderRef.current.offsetWidth;
      const newIndex = Math.round(sliderRef.current.scrollLeft / sliderWidth);
      setActiveIndex(newIndex);
      sliderRef.current.scrollTo({
        left: newIndex * sliderWidth,
        behavior: "smooth",
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 3; // Ajusta la velocidad del arrastre
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScroll = () => {
      const newIndex = Math.round(slider.scrollLeft / slider.offsetWidth);
      setActiveIndex(newIndex);
    };

    slider.addEventListener("scroll", handleScroll);
    return () => {
      slider.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section className="testimonial-slider">
      <input type="radio" name="slider" id="slide1" defaultChecked hidden />
      <input type="radio" name="slider" id="slide2" hidden />
      <input type="radio" name="slider" id="slide3" hidden />

      <div
        className="slider-container"
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="slider-track">
          <div className="testimonial-slide">
            <p className="testimonial-quote">
              "Gracias a esta herramienta, he pasado de evaluar uno o<br></br> dos fondos semanalmente con la asistencia de otra<br></br> persona a gestionar de manera independiente entre tres y<br></br> cuatro fondos en el mismo período."
            </p>
            <p className="testimonial-author">Ejecutivo senior del sector financiero.</p>
          </div>
          <div className="testimonial-slide">
            <p className="testimonial-quote">
              "Esta herramienta ha revolucionado nuestra forma de trabajo, optimizando procesos y ahorrándonos horas semanales."
            </p>
            <p className="testimonial-author">Gerente de operaciones.</p>
          </div>
          <div className="testimonial-slide">
            <p className="testimonial-quote">
              "Increíble solución. La personalización y los resultados han sido excelentes."
            </p>
            <p className="testimonial-author">Director de Innovación.</p>
          </div>
        </div>
      </div>
      <div className="slider-dots-container">
        <label
          htmlFor="slide1"
          className={`dot ${activeIndex === 0 ? "active" : ""}`}
        ></label>
        <label
          htmlFor="slide2"
          className={`dot ${activeIndex === 1 ? "active" : ""}`}
        ></label>
        <label
          htmlFor="slide3"
          className={`dot ${activeIndex === 2 ? "active" : ""}`}
        ></label>
      </div>
    </section>
  );
};

export default Slider;
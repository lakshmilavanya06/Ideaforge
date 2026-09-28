
// Modern JavaScript with improved performance and organization
document.addEventListener('DOMContentLoaded', () => {
  // Initialize components
  initParticleNetwork();
  initDarkMode();
  initMobileMenu();
  initBackToTop();
  initSmoothScrolling();
  initParallaxEffect();
  initCardHoverEffects();
});

// Particle Network Animation
function initParticleNetwork() {
  class ParticleNetwork {
    constructor() {
      this.container = document.getElementById('particleNetwork');
      this.particles = [];
      this.connections = [];
      this.createParticles(40); // Reduced number for better performance
      this.animate();
      window.addEventListener('resize', this.handleResize.bind(this));
    }

    createParticles(count) {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const cellWidth = window.innerWidth / cols;
      const cellHeight = window.innerHeight / rows;
      
      for (let i = 0; i < count; i++) {
        const particle = this.createParticleElement();
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        // Position particles in grid with slight randomness
        particle.x = (col * cellWidth) + (cellWidth/2) + (Math.random()-0.5)*cellWidth*0.3;
        particle.y = (row * cellHeight) + (cellHeight/2) + (Math.random()-0.5)*cellHeight*0.3;
        particle.updatePosition();
        
        this.particles.push(particle);
      }
    }

    createParticleElement() {
      const element = document.createElement('div');
      element.className = 'particle';
      element.style.width = `${4 + Math.random() * 4}px`;
      element.style.height = element.style.width;
      this.container.appendChild(element);
      
      return {
        element,
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        updatePosition() {
          this.element.style.left = `${this.x}px`;
          this.element.style.top = `${this.y}px`;
        },
        update() {
          this.x += this.vx;
          this.y += this.vy;
          
          // Boundary checks with bounce
          if (this.x < 0 || this.x > window.innerWidth) {
            this.vx *= -0.9;
            this.x = Math.max(0, Math.min(window.innerWidth, this.x));
          }
          if (this.y < 0 || this.y > window.innerHeight) {
            this.vy *= -0.9;
            this.y = Math.max(0, Math.min(window.innerHeight, this.y));
          }
          
          // Random direction changes
          if (Math.random() > 0.96) {
            this.vx += (Math.random() - 0.5) * 0.1;
            this.vy += (Math.random() - 0.5) * 0.1;
          }
          
          // Speed limit
          const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
          const maxSpeed = 0.6;
          if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
          }
          
          this.updatePosition();
        }
      };
    }

    handleResize() {
      // Redistribute particles on resize
      const cols = Math.ceil(Math.sqrt(this.particles.length));
      const rows = Math.ceil(this.particles.length / cols);
      const cellWidth = window.innerWidth / cols;
      const cellHeight = window.innerHeight / rows;
      
      this.particles.forEach((particle, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        particle.x = (col * cellWidth) + (cellWidth/2) + (Math.random()-0.5)*cellWidth*0.3;
        particle.y = (row * cellHeight) + (cellHeight/2) + (Math.random()-0.5)*cellHeight*0.3;
      });
    }

    updateConnections() {
      // Clear old connections
      this.connections.forEach(conn => conn.element.remove());
      this.connections = [];
      
      // Create connections between nearby particles
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const p1 = this.particles[i];
          const p2 = this.particles[j];
          
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Connect if within 250px with distance-based probability
          if (distance < 250 && Math.random() > distance/300) {
            const connection = document.createElement('div');
            connection.className = 'particle-connection';
            
            const angle = Math.atan2(dy, dx);
            connection.style.width = `${distance}px`;
            connection.style.left = `${p1.x}px`;
            connection.style.top = `${p1.y}px`;
            connection.style.transform = `rotate(${angle}rad)`;
            connection.style.opacity = 0.8 - (distance / 300);
            
            this.container.appendChild(connection);
            this.connections.push({ element: connection });
          }
        }
      }
    }

    animate() {
      // Use requestAnimationFrame with time-based updates
      const update = (timestamp) => {
        this.particles.forEach(p => p.update());
        this.updateConnections();
        requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    }
  }

  new ParticleNetwork();
}

// Dark Mode Toggle
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  const icon = darkToggle.querySelector('i');
  
  // Check for saved preference or system preference
  const savedMode = localStorage.getItem('darkMode');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedMode === 'enabled' || (savedMode === null && systemPrefersDark)) {
    document.body.classList.add('dark');
    icon.classList.replace('fa-moon', 'fa-sun');
  }
  
  darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    
    icon.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  });
}

// Mobile Menu Toggle
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
  
  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        e.target !== menuToggle) {
      sidebar.classList.remove('active');
    }
  });
}

// Back to Top Button
function initBackToTop() {
  const backToTop = document.getElementById('backToTop');
  
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 300);
  });
  
  backToTop.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Smooth Scrolling
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '#logout') return;
      
      e.preventDefault();
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
        
        // Close mobile menu if open
        if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('active');
        }
      }
    });
  });
}

// Parallax Effect for Hero Image
function initParallaxEffect() {
  const heroImage = document.querySelector('.hero-image');
  if (!heroImage) return;
  
  const updateParallax = (e) => {
    const xAxis = (window.innerWidth / 2 - e.clientX) / 25;
    const yAxis = (window.innerHeight / 2 - e.clientY) / 25;
    heroImage.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
  };
  
  // Only add event listener if not reduced motion
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('mousemove', updateParallax);
  }
}

// Card Hover Effects
function initCardHoverEffects() {
  const cards = document.querySelectorAll('.feature-card');
  
  cards.forEach(card => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    card.addEventListener('mousemove', (e) => {
      const { offsetX: x, offsetY: y } = e;
      const { width, height } = card.getBoundingClientRect();
      const xPos = (x / width) - 0.5;
      const yPos = (y / height) - 0.5;
      
      card.style.transform = `perspective(1000px) rotateY(${xPos * 5}deg) rotateX(${yPos * 5}deg)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
    });
  });
}
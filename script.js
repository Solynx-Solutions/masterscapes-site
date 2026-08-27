// Master Scapes - Interactive JavaScript

/**
 * revealNumber — call button click handler
 * Shows the real phone number beneath the vanity button,
 * then lets the tel: href proceed so mobile dialers activate.
 */
function revealNumber(btn, e) {
    const reveal = btn.nextElementSibling;
    if (reveal && reveal.classList.contains('call-reveal')) {
        reveal.classList.add('visible');
        // On touch devices, allow the tel: link to proceed after a tiny delay
        // so the user sees the number before the dialer pops
        if ('ontouchstart' in window) {
            e.preventDefault();
            setTimeout(() => { window.location.href = btn.href; }, 400);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const header = document.querySelector('.header');

    if (mobileToggle && navMenu) {
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active', isOpen);
            mobileToggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    // Header Shadow & Background on Scroll
    const progressBar = document.querySelector('.scroll-progress');
    const handleScroll = () => {
        // Navbar state
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Progress bar
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        if (progressBar) progressBar.style.width = scrolled + '%';
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    // Smooth Scroll Navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            e.preventDefault();
            const target = document.querySelector(targetId);

            if (target) {
                const headerHeight = header.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - (headerHeight - 20);

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
                mobileToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Active Nav Link on Scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function highlightNav() {
        const scrollPosition = window.scrollY + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNav);

    // Scroll Reveal Animation using IntersectionObserver
    const revealElements = document.querySelectorAll('.service-card, .feature-item, .gallery-item, .about-content, .about-image, .contact-info, .contact-form, .section-title, .section-subtitle');

    // Add reveal class to elements
    revealElements.forEach(el => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: stop observing after reveal
                // revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // Hero Parallax
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
            heroContent.style.opacity = 1 - (scrolled / 700);
        }
    });

    // ── Floating Chat Widget ──────────────────────────────
    const chatTrigger  = document.getElementById('chatWidgetTrigger');
    const chatBody     = document.getElementById('chatWidgetBody');
    const chatClose    = document.getElementById('chatWidgetClose');
    const chatCTA      = document.getElementById('chatWidgetCTA');

    if (chatTrigger && chatBody) {
        let isOpen = false;

        function openChat() {
            isOpen = true;
            chatBody.classList.add('open');
            chatTrigger.classList.add('panel-open');
            chatTrigger.setAttribute('aria-expanded', 'true');
        }

        function closeChat() {
            isOpen = false;
            chatBody.classList.remove('open');
            chatTrigger.classList.remove('panel-open');
            chatTrigger.setAttribute('aria-expanded', 'false');
        }

        chatTrigger.addEventListener('click', () => {
            if (isOpen) closeChat(); else openChat();
        });

        if (chatClose) {
            chatClose.addEventListener('click', (e) => {
                e.stopPropagation();
                closeChat();
            });
        }

        // Close panel after user clicks CTA so they go to the contact section
        if (chatCTA) {
            chatCTA.addEventListener('click', () => {
                setTimeout(closeChat, 300);
            });
        }

        // Auto-open after 8 seconds on first visit
        const hasSeenWidget = sessionStorage.getItem('ms_chat_seen');
        if (!hasSeenWidget) {
            setTimeout(() => {
                openChat();
                sessionStorage.setItem('ms_chat_seen', '1');
            }, 8000);
        }
    }
});

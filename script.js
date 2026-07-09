// Master Scapes - Interactive JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const header = document.querySelector('.header');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
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

    // Form Submission Handling
    const masterScapesForm = document.getElementById('masterScapesForm');

    if (masterScapesForm) {
        masterScapesForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = masterScapesForm.querySelector('button[type="submit"]');
            const responseDiv = masterScapesForm.querySelector('.form-response');
            const formData = new FormData(masterScapesForm);
            const data = Object.fromEntries(formData);

            // Replace with actual GoHighLevel / Zapier webhook
            const WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/WEBHOOKID';

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            try {
                // If no actual URL is set, simulate success for visual demonstration
                if (WEBHOOK_URL.includes('WEBHOOKID')) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } else {
                    const response = await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...data,
                            source: 'Master Scapes Website',
                            timestamp: new Date().toISOString()
                        })
                    });
                    if (!response.ok) throw new Error('Submission failed');
                }

                responseDiv.style.display = 'block';
                responseDiv.style.background = 'rgba(197, 160, 89, 0.1)';
                responseDiv.style.color = '#c5a059';
                responseDiv.style.border = '1px solid #c5a059';
                responseDiv.innerHTML = '<strong>Thank you.</strong> A project specialist will contact you shortly.';

                masterScapesForm.reset();
            } catch (error) {
                console.error('Form Error:', error);
                responseDiv.style.display = 'block';
                responseDiv.style.background = 'rgba(255, 68, 68, 0.1)';
                responseDiv.style.color = '#ff4444';
                responseDiv.style.border = '1px solid #ff4444';
                responseDiv.innerHTML = '<strong>Something went wrong.</strong> Please try again or call us directly.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Request Consultation';
            }
        });
    }

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


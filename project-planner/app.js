(() => {
  "use strict";

  const app = document.querySelector("#app");
  const initialAnswers = () => ({
    projectType: "",
    materials: [],
    squareFootage: "",
    budget: "",
    timeline: "",
    contact: {
      fullName: "",
      phone: "",
      email: "",
      location: "",
      followup: ""
    }
  });

  const steps = [
    {
      id: "projectType",
      title: "What are you planning?",
      intro: "Choose the project type that best describes the space you want to create.",
      choices: ["Luxury Patio", "High-End Driveway", "Resort Pool Deck", "Outdoor Kitchen", "Retaining Wall", "Full Landscape Design", "Multi-Area Estate Project"]
    },
    {
      id: "materials",
      title: "Which materials interest you?",
      intro: "Select all that apply. This can be refined with the Master Scapes team later.",
      multiple: true,
      choices: ["Premium Pavers", "Travertine", "Natural Stone", "Outdoor Porcelain", "Luxury Turf", "DG / Gravel", "Mixed Hardscape + Softscape"]
    },
    {
      id: "squareFootage",
      title: "How large is the project area?",
      intro: "An approximate range is enough for this early planning step.",
      compact: true,
      choices: ["Under 300 sq ft", "300-600 sq ft", "600-1,000 sq ft", "1,000-1,500 sq ft", "1,500-2,000 sq ft", "2,000-3,000 sq ft", "3,000+ sq ft"]
    },
    {
      id: "budget",
      title: "What investment range are you considering?",
      intro: "Select the range you are currently planning around.",
      note: "Proposed ranges for preview review only — pending Matt confirmation.",
      choices: ["$50,000 - $75,000", "$75,000 - $120,000", "$120,000 - $200,000", "$200,000 - $300,000", "$300,000+"]
    },
    {
      id: "timeline",
      title: "When would you like to begin?",
      intro: "Choose the timing that most closely reflects where you are today.",
      choices: ["ASAP", "Within 30 Days", "1-3 Months", "Just Planning"]
    },
    { id: "contact", title: "How should the team follow up?" },
    { id: "review", title: "Review your project plan" }
  ];

  let answers = initialAnswers();
  let currentStep = -1;
  let validationMessage = "";

  const lockIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
    </svg>`;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function renderLanding() {
    app.innerHTML = `
      <div class="landing">
        <div class="landing-copy">
          <p class="eyebrow">Masterscapes Luxury Project Qualification Quiz</p>
          <h1>Bring your outdoor vision into focus.</h1>
          <p>Share a few details about your project, preferred materials, timing, and priorities. At the end, review every answer before this demo is complete.</p>
          <button class="primary-button" type="button" data-action="start">Plan my project</button>
          <p class="privacy-note">${lockIcon}<span>Review mode only — nothing is submitted or stored by this planner.</span></p>
        </div>
        <div class="landing-visual" role="img" aria-label="A completed luxury outdoor living space">
          <div class="visual-note">Design-led outdoor living</div>
        </div>
      </div>`;
    focusHeading();
  }

  function progressPercent() {
    return Math.round(((currentStep + 1) / steps.length) * 100);
  }

  function railMarkup() {
    return `
      <aside class="step-rail" aria-label="Quiz progress">
        <img class="rail-mark" src="../images/masterscapes-logo.png" alt="Master Scapes">
        <p class="rail-kicker">Qualification quiz</p>
        <p class="rail-count">Step ${currentStep + 1} of ${steps.length}</p>
        <div class="progress-track" role="progressbar" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="${currentStep + 1}" aria-label="Quiz progress">
          <span class="progress-fill" style="width:${progressPercent()}%"></span>
        </div>
        <p class="rail-footnote">Your answers stay in this browser tab and disappear when the preview is refreshed.</p>
      </aside>`;
  }

  function selectedFor(step, choice) {
    return step.multiple ? answers[step.id].includes(choice) : answers[step.id] === choice;
  }

  function renderChoiceStep(step) {
    const cards = step.choices.map(choice => {
      const selected = selectedFor(step, choice);
      return `<button class="choice-card${step.multiple ? " multi" : ""}${selected ? " selected" : ""}" type="button" data-choice="${escapeHtml(choice)}" aria-pressed="${selected}">${escapeHtml(choice)}</button>`;
    }).join("");

    renderStepFrame(`
      <p class="eyebrow">Tell us about the project</p>
      <h2 tabindex="-1">${step.title}</h2>
      <p class="step-intro">${step.intro}</p>
      ${step.note ? `<p class="budget-note">${step.note}</p>` : ""}
      <div class="choice-grid${step.compact ? " compact" : ""}" aria-label="${step.title}">${cards}</div>
      ${validationMarkup()}`);
  }

  function renderContact() {
    const contact = answers.contact;
    const followups = ["Phone", "Email", "Text message"].map(choice => `
      <button class="choice-card${contact.followup === choice ? " selected" : ""}" type="button" data-followup="${choice}" aria-pressed="${contact.followup === choice}">${choice}</button>`).join("");

    renderStepFrame(`
      <p class="eyebrow">Almost there</p>
      <h2 tabindex="-1">How should the team follow up?</h2>
      <p class="step-intro">Add the details you want shown in the review summary. This preview does not transmit them.</p>
      <div class="field-grid">
        <div class="field"><label for="fullName">Full name</label><input id="fullName" name="fullName" autocomplete="name" value="${escapeHtml(contact.fullName)}" required></div>
        <div class="field"><label for="phone">Phone number</label><input id="phone" name="phone" type="tel" autocomplete="tel" value="${escapeHtml(contact.phone)}" required></div>
        <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" value="${escapeHtml(contact.email)}" required></div>
        <div class="field"><label for="location">Project location <span>(optional)</span></label><input id="location" name="location" autocomplete="street-address" value="${escapeHtml(contact.location)}"></div>
      </div>
      <p class="followup-label">Preferred follow-up</p>
      <div class="choice-grid followup-grid" aria-label="Preferred follow-up">${followups}</div>
      ${validationMarkup()}`);
  }

  function summaryCard(title, value, stepIndex, wide = false, detail = "") {
    return `
      <article class="summary-card${wide ? " wide" : ""}">
        <div class="summary-card-head"><h3>${title}</h3><button class="edit-button" type="button" data-edit="${stepIndex}">Change</button></div>
        <p>${escapeHtml(value || "Not provided")}</p>
        ${detail ? `<p class="muted-detail">${escapeHtml(detail)}</p>` : ""}
      </article>`;
  }

  function renderReview() {
    const contact = answers.contact;
    const contactPrimary = [contact.fullName, contact.email, contact.phone].filter(Boolean).join(" · ");
    const contactDetail = [contact.location ? `Location: ${contact.location}` : "Location not provided", `Preferred follow-up: ${contact.followup}`].join(" · ");
    const cards = [
      summaryCard("Project type", answers.projectType, 0),
      summaryCard("Materials", answers.materials.join(", "), 1),
      summaryCard("Approximate area", answers.squareFootage, 2),
      summaryCard("Investment range", answers.budget, 3),
      summaryCard("Timeline", answers.timeline, 4),
      summaryCard("Contact", contactPrimary, 5, true, contactDetail)
    ].join("");

    renderStepFrame(`
      <p class="eyebrow">Your project at a glance</p>
      <h2 tabindex="-1">Review your project plan</h2>
      <p class="step-intro">Use any Change control to edit an answer. Everything will remain available when you return here.</p>
      <div class="summary-grid">${cards}</div>
      <p class="review-disclosure"><strong>Demo boundary:</strong> finishing this preview does not calculate a score, assign a fit label, estimate pricing, or send these answers anywhere.</p>`, true);
  }

  function validationMarkup() {
    return validationMessage ? `<p class="validation" role="alert">${escapeHtml(validationMessage)}</p>` : "";
  }

  function renderStepFrame(content, finalStep = false) {
    app.innerHTML = `
      <div class="step-layout">
        ${railMarkup()}
        <section class="step-panel">
          <div class="step-content">${content}</div>
          <div class="step-actions">
            <button class="text-button" type="button" data-action="back">Back</button>
            <button class="primary-button" type="button" data-action="${finalStep ? "finish" : "next"}">${finalStep ? "Finish preview" : "Continue"}</button>
          </div>
        </section>
      </div>`;
    focusHeading();
  }

  function renderCompletion() {
    app.innerHTML = `
      <section class="completion">
        <div class="completion-inner">
          <div class="completion-mark" aria-hidden="true">✓</div>
          <p class="eyebrow">Project plan reviewed</p>
          <h2 tabindex="-1">Let’s bring your outdoor vision to life.</h2>
          <p>You’ve taken the first step. Next step is a conversation with MasterScapes to explore ideas, priorities and project details.</p>
          <p class="completion-boundary">No submission was created, no score was calculated, and no information left this planner.</p>
          <div class="completion-actions">
            <a class="primary-button consultation-link" href="https://link.masterscapes.pro/widget/booking/v4JyGfcCJLQ7nWzjdIIM">Schedule My Project Consultation</a>
            <button class="text-button restart-button" type="button" data-action="restart">Start again</button>
          </div>
        </div>
      </section>`;
    focusHeading();
  }

  function render() {
    validationMessage = "";
    if (currentStep === -1) return renderLanding();
    const step = steps[currentStep];
    if (step.id === "contact") return renderContact();
    if (step.id === "review") return renderReview();
    return renderChoiceStep(step);
  }

  function focusHeading() {
    window.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => app.querySelector("h1, h2")?.focus({ preventScroll: true }));
  }

  function syncContactFromInputs() {
    ["fullName", "phone", "email", "location"].forEach(field => {
      const input = app.querySelector(`#${field}`);
      if (input) answers.contact[field] = input.value.trim();
    });
  }

  function validateCurrent() {
    const step = steps[currentStep];
    if (step.id === "contact") {
      syncContactFromInputs();
      if (!answers.contact.fullName || !answers.contact.phone || !answers.contact.email) {
        validationMessage = "Please add your name, phone number, and email address to continue.";
        return false;
      }
      const emailInput = app.querySelector("#email");
      if (!emailInput.checkValidity()) {
        validationMessage = "Please enter a valid email address.";
        return false;
      }
      if (!answers.contact.followup) {
        validationMessage = "Please choose a preferred follow-up method.";
        return false;
      }
      return true;
    }
    const value = answers[step.id];
    if ((Array.isArray(value) && value.length === 0) || !value) {
      validationMessage = step.multiple ? "Please select at least one option to continue." : "Please select an option to continue.";
      return false;
    }
    return true;
  }

  function showValidation() {
    const existing = app.querySelector(".validation");
    if (existing) existing.remove();
    const host = app.querySelector(".choice-grid:last-of-type, .field-grid");
    host?.insertAdjacentHTML("afterend", validationMarkup());
    app.querySelector(".validation")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  app.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.choice) {
      const step = steps[currentStep];
      const choice = button.dataset.choice;
      if (step.multiple) {
        const selected = answers[step.id];
        answers[step.id] = selected.includes(choice) ? selected.filter(item => item !== choice) : [...selected, choice];
      } else {
        answers[step.id] = choice;
      }
      validationMessage = "";
      renderChoiceStep(step);
      return;
    }

    if (button.dataset.followup) {
      syncContactFromInputs();
      answers.contact.followup = button.dataset.followup;
      validationMessage = "";
      app.querySelectorAll("[data-followup]").forEach(choice => {
        const selected = choice.dataset.followup === answers.contact.followup;
        choice.classList.toggle("selected", selected);
        choice.setAttribute("aria-pressed", String(selected));
      });
      app.querySelector(".validation")?.remove();
      return;
    }

    if (button.dataset.edit !== undefined) {
      currentStep = Number(button.dataset.edit);
      render();
      return;
    }

    switch (button.dataset.action) {
      case "start":
        currentStep = 0;
        render();
        break;
      case "back":
        if (steps[currentStep].id === "contact") syncContactFromInputs();
        currentStep = Math.max(-1, currentStep - 1);
        render();
        break;
      case "next":
        if (!validateCurrent()) {
          showValidation();
          return;
        }
        currentStep += 1;
        render();
        break;
      case "finish":
        renderCompletion();
        break;
      case "restart":
        answers = initialAnswers();
        currentStep = -1;
        render();
        break;
    }
  });

  render();
})();

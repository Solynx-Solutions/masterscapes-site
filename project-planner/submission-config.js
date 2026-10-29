(() => {
  "use strict";

  window.MASTER_SCAPES_PLANNER_SUBMISSION ||= Object.freeze({
    mode: "native",
    native: Object.freeze({
      enabled: true,
      surveyUrl: "https://link.masterscapes.pro/widget/survey/eC2FhSBs8UQw0imOhv5X",
      sourceValue: "Master Scapes Project Planner",
      queryKeys: Object.freeze({
        projectType: "single_dropdown_3mln",
        materials: "checkbox_1828",
        squareFootage: "single_dropdown_491j",
        budget: "single_dropdown_4q2j",
        timeline: "single_dropdown_4kx2"
      }),
      materialsPrefill: Object.freeze({
        enabled: false,
        encoding: "unverified"
      }),
      verified: Object.freeze({
        surveyOpen: true,
        contactFieldsVisible: true,
        consentVisible: true,
        thankYouAndConsultationLink: true,
        notificationSettingsReadBack: true
      })
    })
  });
})();

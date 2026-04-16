document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupButton = signupForm.querySelector('button[type="submit"]');
  const messageDiv = document.getElementById("message");
  let activitiesState = {};
  const signupButtonDefaultText = signupButton.textContent;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function setSignupLoading(isLoading) {
    signupButton.disabled = isLoading;
    signupButton.classList.toggle("button-loading", isLoading);

    if (isLoading) {
      signupButton.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Signing up...';
      signupButton.setAttribute("aria-busy", "true");
    } else {
      signupButton.textContent = signupButtonDefaultText;
      signupButton.removeAttribute("aria-busy");
    }
  }

  function setParticipantDeleteLoading(button, isLoading) {
    if (!button) {
      return;
    }

    button.disabled = isLoading;
    button.classList.toggle("participant-delete-loading", isLoading);

    if (isLoading) {
      button.innerHTML = '<span class="button-spinner participant-button-spinner" aria-hidden="true"></span>';
      button.setAttribute("aria-busy", "true");
    } else {
      button.innerHTML = "&times;";
      button.removeAttribute("aria-busy");
    }
  }

  function renderActivities() {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    // Render each activity with participants section
    Object.entries(activitiesState).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const participantsItems = details.participants.length
        ? details.participants
            .map(
              (participant) => `
                <li class="participant-item">
                  <div class="participant-row">
                    <span class="participant-email">${participant}</span>
                    <button
                      type="button"
                      class="participant-delete"
                      data-activity="${encodeURIComponent(name)}"
                      data-email="${encodeURIComponent(participant)}"
                      aria-label="Unregister ${participant} from ${name}"
                      title="Unregister participant"
                    >
                      &times;
                    </button>
                  </div>
                </li>
              `
            )
            .join("")
        : '<li class="participants-empty">No participants yet</li>';

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-section">
          <p class="participants-heading">
            <strong>Participants Signed Up</strong>
            <span class="participants-count">${details.participants.length}</span>
          </p>
          <ul class="participants-list">
            ${participantsItems}
          </ul>
        </div>
      `;

      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  function showMessage(type, text) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsMarkup = details.participants.length
          ? `
            <ul class="participants-list">
              ${details.participants
                .map(
                  (participant) => `
                    <li class="participant-item">
                      <span class="participant-email">${participant}</span>
                      <button
                        type="button"
                        class="delete-participant"
                        data-activity="${name}"
                        data-email="${participant}"
                        aria-label="Unregister ${participant} from ${name}"
                      >&times;</button>
                    </li>
                  `
                )
                .join("")}
            </ul>
          `
          : "<p class=\"empty-state\">No participants yet.</p>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p><strong>Participants:</strong></p>
          ${participantsMarkup}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const activity = document.getElementById("activity").value;
    setSignupLoading(true);

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage("success", result.message);
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage("error", result.detail || "An error occurred");
      }
    } catch (error) {
      showMessage("error", "Failed to sign up. Please try again.");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-participant");
    if (!button) {
      return;
    }

    const activity = button.dataset.activity;
    const email = button.dataset.email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage("success", result.message);
        await fetchActivities();
      } else {
        showMessage("error", result.detail || "Failed to unregister participant.");
      }
    } catch (error) {
      showMessage("error", "Failed to unregister participant. Please try again.");
      console.error("Error unregistering participant:", error);
    }
  });

  // Initialize app
  fetchActivities();
});


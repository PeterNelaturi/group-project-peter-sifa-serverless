let timeSlots = [];
let numberFilter = 0;
let timeFilter = -1;
let map;
let toursData = [];

document.addEventListener("DOMContentLoaded", () => {
  loadMap();
});

document.getElementById('number').addEventListener('change', function () {
  numberFilter = this.value;
  console.log('user input a number:', numberFilter);

  refreshPopup();
});

document.getElementById('timeSelector').addEventListener('change', function () {
  timeFilter = this.value;
  const selectedText = this.options[this.selectedIndex].text;

  console.log('user select:', selectedText, '(value:', timeFilter, ')');

  refreshPopup();
});

function fillTimeSelector() {
  console.log("fillTimeSelector, size:", timeSlots.length);

  const select = document.getElementById('timeSelector');

  // clear all except the first one
  while (select.options.length > 1) {
    select.remove(1);
  }

  timeSlots.forEach((time, index) => {
    const newOption = document.createElement('option');
    newOption.value = index;
    newOption.text = time;
    select.appendChild(newOption);
  });
}

function refreshPopup() {
  toursData.forEach((tour) => {
    const popup = tour.marker.getPopup();
    popup.setContent(createPopupContent(tour));
  });
}

function createPopupContent(tour) {
  const launchesHtml = tour.launches.map((l, index) => {
    const isAvailable = (l.capacity > 0 && l.capacity >= numberFilter) && (timeFilter == -1 || timeSlots[timeFilter] === l.time);

    const textColor = isAvailable ? 'text-success' : 'text-danger'; // Bootstrap 绿色 / 红色
    const bgColor = isAvailable ? 'bg-light' : 'bg-warning-subtle'; // 背景色可选

    return `
    <div class="${bgColor} p-2 rounded mb-2">
      <div class="${textColor}">Time: ${l.time}</div>
      <div class="${textColor}">Remaining seats: ${l.capacity}</div>
      ${isAvailable
        ? `<a href="#" class="book-now btn btn-sm btn-primary mt-1 text-white" data-tour-id="${tour.id}" data-launch-index="${index}">Book Now</a>`
        : '<span class="text-muted">Not eligible for booking</span>'
      }
    </div>
    `;
  }).join("<hr>");

  return `
    <b>${tour.operator}</b><br><br>
    <div class="d-flex align-items-start gap-3">
      <div style="flex-grow:1; min-width:0;">
        ${launchesHtml}
      </div>
      <img src="${tour.image}" width="150" height="200" style="flex-shrink:0;">
    </div>
  `;
}

function loadMap() {
  if (document.getElementById("map")) {
    fetch("/api/tours")
      .then((res) => res.json())
      .then((tours) => {
        toursData = tours;
        console.log(tours);

        map = L.map("map").setView([-36.84, 174.76], 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors"
        }).addTo(map);

        //get all time slots
        tours.forEach((tour) => {
          const times = tour.launches.map(l => l.time);
          times.forEach(time => {
            if (!timeSlots.includes(time)) {
              timeSlots.push(time);
            }
          });
        });
        timeSlots.sort();
        console.log(timeSlots);

        fillTimeSelector();

        tours.forEach((tour) => {
          const marker = L.marker([tour.location.lat, tour.location.lng]).addTo(map);
          tour.marker = marker;

          const popup = L.popup({
            autoClose: false,
            closeOnClick: false,
            closeButton: false
          }).setContent(createPopupContent(tour));

          let popupHovered = false;


          marker.bindPopup(popup);

          marker.on("mouseover", () => {
            marker.openPopup();
          });

          marker.on("mouseout", () => {
            setTimeout(() => {
              if (!popupHovered) marker.closePopup();
            }, 200);
          });

          popup.on('add', () => {
            const popupEl = popup.getElement();

            popupEl.addEventListener('mouseenter', () => {
              popupHovered = true;
            });

            popupEl.addEventListener('mouseleave', () => {
              popupHovered = false;
              marker.closePopup();
            });
          });

          marker.on("popupopen", function (e) {
            const popupNode = e.popup.getElement();
            popupNode.querySelectorAll(".book-now").forEach(link => {
              link.addEventListener("click", (ev) => {
                ev.preventDefault();
                const tourId = parseInt(link.dataset.tourId);
                const launchIndex = parseInt(link.dataset.launchIndex);
                showBookingForm(tourId, launchIndex);
              });
            });
          });
        });
      });
  }
}


function showBookingForm(tourId, launchIndex) {
  const tour = toursData.find(t => t.id === tourId);
  const launch = tour.launches[launchIndex];

  const modalBody = document.getElementById("modalBody");
  let totalPrice = numberFilter * tour.price;
  modalBody.innerHTML = `
  <h5>Booking for ${tour.operator}</h5>
  <p>
    Time: ${launch.time}<br>
    Remaining seats: ${launch.capacity}<br>
    Unit Price: $${tour.price}<br>
    Total Price: $<span id="totalPrice">${totalPrice}</span>
  </p>
  <form id="personalForm">
    <div class="mb-3">
      <label class="form-label">First Name</label>
      <input type="text" id="firstName" class="form-control" required>
    </div>
    <div class="mb-3">
      <label class="form-label">Last Name</label>
      <input type="text" id="lastName" class="form-control" required>
    </div>
    <div class="mb-3">
      <label class="form-label">Email</label>
      <input type="email" id="email" class="form-control" required>
    </div>
    <div class="mb-3">
      <label class="form-label">Phone</label>
      <input type="tel" id="phone" class="form-control" required>
    </div>
    <div class="mb-3">
      <label class="form-label">Number</label>
      <input type="number" id="partySize" value="${numberFilter}" class="form-control" min="1" max="${launch.capacity}" required>
    </div>
    <button type="submit" class="btn btn-primary">Book</button>
  </form>
  <div id="summary" class="mt-3"></div>
`;

  const partySizeInput = document.getElementById("partySize");
  const totalPriceSpan = document.getElementById("totalPrice");

  if (partySizeInput && totalPriceSpan) {
    partySizeInput.addEventListener("input", () => {
      const size = parseInt(partySizeInput.value) || 0;
      const newTotal = tour.price * size;
      totalPriceSpan.textContent = newTotal.toFixed(2); // 保留两位小数
    });
  }


  const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
  bookingModal.show();


  document.getElementById("personalForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const bookingData = {
      firstName: document.getElementById("firstName").value,
      lastName: document.getElementById("lastName").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      tourId,
      time: launch.time,
      partySize: parseInt(document.getElementById("partySize").value)
    };


    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${bookingData.firstName} ${bookingData.lastName}`,
        partySize: bookingData.partySize,
        tourId: bookingData.tourId,
        time: bookingData.time
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          return;
        }

        launch.capacity -= bookingData.partySize;

        if (tour.marker) {
          tour.marker.getPopup().setContent(createPopupContent(tour));
        }

        const totalPrice = tour.price * bookingData.partySize;
        modalBody.innerHTML = `
  <h5 class="fw-bold mb-3 text-center">Booking Summary</h5>

  <div class="ms-3">
    <table class="table table-borderless">
      <tbody>
        <tr>
          <th class="text-start">Booking ID:</th>
          <td class="text-start">${String(data.id).padStart(7, '0')}</td>
        </tr>
        <tr>
          <th class="text-start">Name:</th>
          <td class="text-start">${bookingData.firstName} ${bookingData.lastName}</td>
        </tr>
        <tr>
          <th class="text-start">Email:</th>
          <td class="text-start">${bookingData.email}</td>
        </tr>
        <tr>
          <th class="text-start">Phone:</th>
          <td class="text-start">${bookingData.phone}</td>
        </tr>
        <tr>
          <th class="text-start">Operator:</th>
          <td class="text-start">${toursData.find(t => t.id === tourId).operator}</td>
        </tr>
        <tr>
          <th class="text-start">Location:</th>
          <td class="text-start">${toursData.find(t => t.id === tourId).operator} Street, Auckland</td>
        </tr>
        <tr>
          <th class="text-start">Date:</th>
          <td class="text-start">${new Date().toLocaleDateString()}</td>
        </tr>
        <tr>
          <th class="text-start">Time:</th>
          <td class="text-start">${launch.time}</td>
        </tr>
        <tr>
          <th class="text-start">Number:</th>
          <td class="text-start">${bookingData.partySize}</td>
        </tr>
         <tr>
          <th class="text-start">Total:</th>
          <td class="text-start">$${totalPrice}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-4 text-center">
    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
  </div>
`;

      });

  });

}

function HomeBtn() {
  const mainContainer = document.getElementById("mainContainer");
  if (mainContainer) mainContainer.style.display = "block";

  const bookingContainer = document.getElementById("bookingContainer");
  if (bookingContainer) bookingContainer.innerHTML = "";

  const mapDiv = document.getElementById("map");
  if (mapDiv) map.setView([-36.84, 174.76], 12);
}


function BookingBtn() {
  const mainContainer = document.getElementById("mainContainer");
  if (mainContainer) mainContainer.style.display = "none";

  bookingContainer.innerHTML = `
      
       
  <div class="d-flex justify-content-center align-items-center mb-3 mt-5">
    <label for="lookupId" class="form-label me-2 mb-0">Booking ID:</label>

    <input type="text" id="lookupId" class="form-control w-auto text-center me-2" placeholder="Enter 7 Digit ID" inputmode="numeric" maxlength="7">

    <button id="searchBooking" class="btn btn-primary">Search</button>
  </div>
  <div id="bookingResult" class="p-3 bg-white rounded shadow text-center"></div>
`;


  const searchBtn = document.getElementById("searchBooking");
  searchBtn.addEventListener("click", () => {
    const id = parseInt(document.getElementById("lookupId").value);
    if (!id) return alert("Enter a valid booking ID");

    fetch(`/api/bookings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Booking not found");
        return res.json();
      })
      .then(data => {


        const bookingResult = document.getElementById("bookingResult");
        bookingResult.innerHTML = `
  <div class="d-flex justify-content-center">
    <div class="border rounded p-3 bg-light text-start w-auto">
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Operator:</strong> ${data.operator}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${data.time}</p>
      <p><strong>Size:</strong> ${data.partySize}</p>
    </div>
  </div>
  <div class="text-center mt-3">
    <button id="deleteBooking" class="btn btn-danger">Delete</button>
  </div>
`;

        const deleteBtn = document.getElementById("deleteBooking");
        deleteBtn.addEventListener("click", () => {
          fetch(`/api/bookings/${id}`, { method: "DELETE" })
            .then(res => {
              if (!res.ok) throw new Error("Booking not found");
              return res.json();
            })
            .then(resp => {
              alert(resp.message);

              const tour = toursData.find(t => t.id === data.tourId);
              if (tour) {
                const launch = tour.launches.find(l => l.time === data.time);
                if (launch) launch.capacity += data.partySize;
                if (tour.marker) {
                  tour.marker.getPopup().setContent(createPopupContent(tour));
                }
              }

              HomeBtn();
            })
            .catch(err => {
              alert("delete fail" + err.message); // 失败时的提示
            });
        });
      })
      .catch(err => {
        document.getElementById("bookingResult").innerHTML = `<p class="text-danger">${err.message}</p>`;
      });
  });
}


function wireframeT1() {
  window.open("assets/wireFrame/wireFrame task 1.pdf", "_blank");
}

function wireframeT2() {
  window.open("assets/wireFrame/wireFrame task 2.pdf", "_blank");
}

function storyboards() {
  window.open("assets/storyBoard/Storyboard task 2.pdf", "_blank");
}
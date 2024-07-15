window.addEventListener('load', initializeMainMap)

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function initializeMainMap() {
  bangkok = [13.7524938, 100.4935089]
  // kmitl = [13.7276, 100.7783]
  mainMap = L.map('mainMap').setView(bangkok, 10);
// var marker = L.marker([51.5, -0.09]).addTo(map);
  // var polygon = L.polygon([
  //   [51.509, -0.08],
  //   [51.503, -0.06],
  //   [51.51, -0.047]
  //   ]).addTo(map);
  // marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mainMap);
  // map.on('click', onMapClick);
}

function showPersonDialog() {
  console.log("Showing person dialog.")
  document.getElementById('addPersonDialog').showModal()
  map.invalidateSize()
}

async function addPerson() {
  let personNameEl = document.getElementById('personName');
  let username = personNameEl.value;

  let smlp = searchMarkerLocations['pickup']
  let smld = searchMarkerLocations['dropoff']

  if (username == '') {
    alert("Please enter a name.")
    return
  }
  else if (poiData.filter(poi => poi.user == username).length > 0) {
    alert("This person already exists in the list.")
    return
    
  }
  else if (smlp == null || smld == null) {
    alert("Please select a pickup and dropoff location.")
    return
  }
  console.log(`Adding a person ${username}`)
  
  poiData.push({ 'type': 'pickup', 'user': username, ...smlp });
  poiData.push({ 'type': 'dropoff', 'user': username, ...smld });
  //personNameEl.value = ''

  document.getElementById('addPersonDialog').close()
  // pickStartingLocation(username)
  await poiToTable()
} 


// function pickStartingLocation(username) {
//   let locationDialogEl = document.getElementById('locationDialog')
//   locationDialogEl.querySelector('.dialogTitle > h2').innerText = `Pick a starting location for ${username}`

//   document.getElementById('backwardButton').onclick = () => { locationDialogEl.close(); showPersonDialog() }
//   document.getElementById('forwardButton').onclick = async () => { await saveStartingLocation(username) }
//   document.getElementById('pickerStepDescription').innerHTML = `Step 2 of 3`
//   locationDialogEl.showModal()
//   console.info(`Showing startLocation modal for ${username}`)
//   map.invalidateSize()

//   console.info(`Placing default POI for pickup point picking.`)
//   placeSearchedPOI({ lat: 13.7524938, lng: 100.4935089, name: 'Use the search box or move this pin.' }, zoomLevel=12)
//   //Note: MODIFY VALUE IN mapstuff.js at saveSearchMarkerLocationAs also!!
// }

// async function saveStartingLocation(username) {
//   let saveSuccess = await saveSearchMarkerLocationAs('pickup', username)
//   if (saveSuccess) {
//     //proceed
//     pickDestinationLocation(username)
//   }

// }

// function pickDestinationLocation(username) {
//   let locationDialogEl = document.getElementById('locationDialog')
//   locationDialogEl.querySelector('.dialogTitle > h2').innerText = `Pick a destination location for ${username}`

//   document.getElementById('backwardButton').onclick = async () => { await pickStartingLocation(username) }
//   document.getElementById('forwardButton').onclick = async () => { await saveDestinationLocation(username) }
//   document.getElementById('pickerStepDescription').innerHTML = `Step 3 of 3`
//   console.log(`Placing default POI for destination picking.`)
//   placeSearchedPOI({lat: 13.7524938, lng: 100.4935089, name: 'Use the search box or move this pin.'}, zoomLevel=12)
// }

// async function saveDestinationLocation(username) {
//   let saveSuccess = await saveSearchMarkerLocationAs('dropoff', username)
//   if (saveSuccess) {
//     //proceed
//     document.getElementById('locationDialog').close()
//     console.log(`Destination location saved for ${username}`)
//     poiToTable()
//   }
// }

async function poiToTable() {
  let tableBody = document.getElementById('poiTableBody')
  // Reverse search ever POI to get the name using promise.all
  let colors = ['red', 'orange', 'green', 'yellow', 'blue', 'violet']
  let destinationTableData = ""

  for (let i = 0; i < poiData.length; i++) {
    let poi = poiData[i]
    let color = colors[i % colors.length]
    destinationTableData += `
      <tr>
        <td><image src="${LEAFLET_COLOR_MARKERS_BASE}/marker-icon-2x-${color}.png"></image></td>
        <td>${poi.type}</td>
        <td>${poi.user}</td>
        <td>${poi.name}</td>
        <td>${poi.lat}</td>
        <td>${poi.lng}</td>
      </tr>`;
  }
  destinationTableData += `</table>`
  tableBody.innerHTML = destinationTableData

  localStorage['poiData'] = JSON.stringify(poiData)

  await updateMainMap()
}


mainMapMarkers = []
async function updateMainMap() {
  // Remove all markers from the mainMap
  for (let marker of mainMapMarkers) {
    marker.remove()
  }
  
  // Copy markers to mainMapMarkers and add it to the mainMap
  
  let colorMarkers = [redIcon, orangeIcon, greenIcon, yellowIcon, blueIcon, violetIcon]
  for (let i = 0; i < poiData.length; i++) {
    let poi = poiData[i]
    let poiIcon = colorMarkers[i % colorMarkers.length]
    let marker = L.marker([poi.lat, poi.lng], { draggable: false, icon: poiIcon }).addTo(mainMap);
    marker.bindPopup(`${capitalize(poi.type)} ${poi.user} at <i>${poi.name}</i>`).openPopup()
    mainMapMarkers.push(marker)
  }

  await plotMostEfficientRoute()

}

function clearRoutes() {
  localStorage['poiData'] = JSON.stringify([])
  window.location.reload()
}
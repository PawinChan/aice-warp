window.addEventListener('load', initializeMap)
window.addEventListener('load', initializeAutoSearch)
window.addEventListener('load', restoreSavedPOIs)


NOMINATIM_URL = "nominatim.pawin.me"
OPENROUTE_URL = "openrouteservice.pawin.me/ors"
markers = []
poiData = []

// searchMarker = null
// searchMarkerLocation = null

searchMarkers = { 'pickup': null, 'dropoff': null }
searchMarkerLocations = { 'pickup': null, 'dropoff': null }

previousSearchQuery = ""
searchTimeoutSec = 0.1
searchAvailable = true


async function restoreSavedPOIs() {
  if (localStorage['poiData']) {
    try {
      poiData = JSON.parse(localStorage['poiData'])
      await poiToTable()
    }
    catch (error) {
      console.error("Error restoring saved POIs.")
      console.error(error)
      poiData= []
    }
  }
}

function initializeMap() {
  bangkok = [13.7524938, 100.4935089]
  // kmitl = [13.7276, 100.7783]
  map = L.map('map').setView(bangkok, 10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  // map.on('click', onMapClick);
}


function ensureLng(obj) {
  if (obj.lat && obj.lng) {
    return obj
  }
  else if (obj.lat && obj.lon) {
    obj.lng = obj.lon
    delete obj.lon
    return obj

  } else {
    console.error("Error: No lat lon or lat lng found.")
    return null
  }
}


// function numToLetter(num) {
//   return String.fromCharCode(65 + num);
// }
// function onMapClick(e) {
  // let newMarker = L.marker(e.latlng).addTo(map);
  // newMarker.bindPopup(`Point ${numToLetter(markers.length)}`).openPopup()
  // markers.push(newMarker)
// }

function ensureShortname(obj) {
  if (obj.name) {
    return obj
  }
  else if (obj.display_name) {
    obj.name = obj.display_name.split(',')[0]
    return obj
  } else {
    console.error("Error: No name or display_name found.")
    return null
  }
}

function stripIrrelevantData(obj) {
  console.log(obj)
  return { 'lat': obj.lat, 'lng': obj.lng, 'name': obj.name }

}

async function searchPlace(query) {
  // let input = document.getElementById('search-input').value
  let resp  = await fetch(`https://${NOMINATIM_URL}/search?q=${query.trim()}&format=json&countrycodes=TH`, { cache: "force-cache" })
  let data = await resp.json()
  console.log("Search completed.")
  console.log(data)
  return data
}

async function reverseSearch(lat, lon) {
  let resp  = await fetch(`https://${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json`, { cache: "force-cache" })
  let data = await resp.json()
  console.log("Reverse search completed.")
  console.log(data)
  return data
}

function initializeAutoSearch() {
  document.getElementById('pickupLocationSearch').addEventListener('input', () => { searchLocation('pickup') })
  document.getElementById('dropoffLocationSearch').addEventListener('input', () => { searchLocation('dropoff') })
}

function prettifyName(display_name) {
  let split = display_name.split(',')
  return `<span class="searchResultTextMain">${split[0]}</span><span class="searchResultTextSub">, ${split.slice(1, 3).join(',')}</span>`
}

async function searchLocation(locationType) {
  // console.log(`${locationType}LocationSearch`)
  let query = document.getElementById(`${locationType}LocationSearch`).value
  if ((query == previousSearchQuery) || (searchAvailable == false)) {
    return
  }
  searchAvailable = false
  previousSearchQuery = query


  console.log(`Searching for ${query}. Holding search lock.`)
  let data = await searchPlace(query)
  let resultsEl = document.getElementById(`${locationType}LocationResults`)
  resultsEl.innerHTML = ''

  if (data.length > 0) {

    for (const place of data) {
      
      let result = document.createElement('div')
      result.innerHTML = prettifyName(place.display_name)
      result.onclick = () => {
        placeSearchedPOI(place, as=locationType)
      }
      resultsEl.appendChild(result)

    }
    console.log(`Search completed, ${data.length} results found.`)
  } else {
    resultsEl.innerHTML = 'No results found.'
  }
  setTimeout(async () => { searchAvailable = true; console.log("Search Re-enabled.");  await searchLocation(locationType)}, searchTimeoutSec * 1000)
}

function placeSearchedPOI(place, as, zoomLevel = 15) {
  switch (as) {
    case 'pickup':
      var icon = blueIcon
      break;
    case 'dropoff':
      var icon = redIcon
      break;
    default:
      console.error(`Invalid location type ${as} given to placeSearchedPOI`)
      return
  }

  let sm = searchMarkers[as]
  let other_sm = searchMarkers[as == 'pickup' ? 'dropoff' : 'pickup']

  let sml = stripIrrelevantData(ensureShortname(ensureLng(place)))
  let other_sml= searchMarkerLocations[as == 'pickup' ? 'dropoff' : 'pickup']

  if (sm) {
    console.log("Removing previous search marker...")
    sm.remove()
  }
  console.log(`Placing search marker at ${place.lat}, ${place.lon} (${place.display_name})`)
  // console.log(place)
  
  if (other_sml) {
    map.flyToBounds([sml, other_sml])
  }
  else {
    map.flyTo([sml.lat, sml.lng], zoomLevel)
  }

  sm = L.marker(sml, {draggable: true, autoPan: true, icon: icon}).addTo(map);
  // sm.bindPopup(`${sm.name}: <a onclick="placePin(this)">Confirm</a>`).openPopup();

  sm.bindPopup(sml.name).openPopup();
  sm.on('moveend', (event) => { updateSearchMarkerLocation(event, as) })
  console.log(`Placed search marker at ${sml.lat}, ${sml.lng}`)
  searchMarkers[as] = sm
  searchMarkerLocations[as] = sml
}

async function updateSearchMarkerLocation(event, as) {
  let sml = ensureLng(event.target.getLatLng())

  let searchData = await reverseSearch(sml.lat, sml.lng)
  sml['name'] = ensureShortname(searchData)['name']

  event.target.bindPopup(sml.name).openPopup()
  console.log(`Updated search marker location to ${sml}`)
  searchMarkerLocations[as] = stripIrrelevantData(sml)
}


// async function saveSearchMarkerLocationAs(type, user) {

//   let sml = searchMarkerLocations[type]

//   if (sml.name == 'Use the search box or move this pin.') {
//     alert('Please search for a location first.')
//     return false
//   }

//   let newPoiData = { ...sml, 'type': type, 'user': user }
//   let existingIndex = poiData.findIndex(({ foundUser, foundType }) => foundUser === user && foundType === type);

//   if (existingIndex !== -1) {
//     poiData[existingIndex] = newPoiData
//   }
//   else {
//     poiData.push(newPoiData)
//   }

//   // let newMarker = L.marker(sml, {draggable: false, icon: redIcon}).addTo(map);
//   // newMarker.bindPopup(`${sml.title}`).openPopup()
//   // markers.push(newMarker)
  
//   poiToTable()
//   console.log(`Saved search marker location as ${type} for ${user}`)
//   return true
// }



// function placePin(el, icon=pinIcon, marker) {
//   searchMarker.remove()

//   let title = searchMarkerLocation.name
//   let newMarker = L.marker(searchMarkerLocation, {draggable: false, icon: pinIcon}).addTo(map);
//   newMarker.bindPopup(`${title}`).openPopup()
//   markers.push(newMarker)
//   let newPoiData = { ...searchMarkerLocation }
//   poiData.push(newPoiData)
//   poiToTable()

// }
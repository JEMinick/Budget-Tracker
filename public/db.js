let db;
const request = indexedDB.open("budget", 1);

request.onupgradeneeded = function (event) {
  console.log('Upgrade needed in IndexedDB');

  // on onupgradeneeded:
  // 1. We update the db variable to our latest event.target.result

  const { oldVersion } = event;
  const newVersion = event.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  const db = event.target.result;

  console.log (db);

  // Inside onupgradeneeded, create an object store called budget 
  // and set autoIncrement to true.

  // 2. we can check to see what object stores we currently
  //    have by checking the object stores with "db.objectStoreNames" and seeing
  //    if our object store is in there. If its not, then lets create the
  //    objectStore like we have been. pass in autoincrement in this case
  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('pending', { autoIncrement: true });
  }
};

request.onsuccess = function (event) {
  console.log('success');
  db = event.target.result;

  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

request.onerror = function (event) {
  console.log(`Woops! ${event.target.errorCode}`);
};

function saveRecord(record) {
  console.log('Save record invoked');
  const transaction = db.transaction(["pending"], "readwrite");
  const store = transaction.objectStore("pending");

  store.add(record);
}

function checkDatabase() {
  const transaction = db.transaction(["pending"], "readwrite");
  const store = transaction.objectStore("pending");
  const getPending = store.getAll();

  getPending.onsuccess = function () {
    if (getPending.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getPending.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json"
        }
      })
      .then(response => response.json())
      .then(() => {
        // Clear our offline buffer: delete records when successful:
        const transaction = db.transaction(["pending"], "readwrite");
        const store = transaction.objectStore("pending");
        store.clear();
      });
    }
  };
}

function deletePending() {
  const transaction = db.transaction(["pending"], "readwrite");
  const store = transaction.objectStore("pending");
  store.clear();
}

// listen for app coming back online
window.addEventListener( "online", checkDatabase) ;

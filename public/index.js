let transactions = [];
let myChart;
let bCachingTransactions = false;

fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;

    populateTotal();
    populateTable();
    populateChart();
  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

function sendTransaction(isAdding) {
  const nameEl = document.querySelector("#t-name");
  const amountEl = document.querySelector("#t-amount");
  // const errorEl = document.querySelector("form .error");
  let errorEl = document.querySelector("#post-error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  } else {
    errorEl.textContent = "";
  }

  // create record
  const transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {
    let data = response.json();
    if ( data.errors ) {
      errorEl.textContent = "Missing Information";
    } else {
      console.log( `SUCCESSFUL POST:` );
      console.log( data );
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
    // fetch failed, so save in indexedDB
    console.log( `CACHING POST:` );
    console.log( transaction );

    if ( !bCachingTransactions ) {
      // Let's update the display to remove data that is
      // only available while online...
    }

    saveRecord(transaction);

    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}

function purgeBudget() {
  const nameEl = document.querySelector("#t-name");
  const amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector("#post-error");

  fetch("/api/clearall", {
    method: "DELETE",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {
    let data = response.json();
    if ( data.errors ) {
      errorEl.textContent = "Unable to purge the budget!";
    } else {
      console.log( `SUCCESSFUL PURGE!` );
      console.log( data );
      // clear form
      nameEl.value = "";
      amountEl.value = "";
      errorEl.value = "";

      // re-run logic to populate ui with no budget info:
      transactions = [];
      populateChart();
      populateTable();
      populateTotal();
    }
  })
  .catch(err => {
    // fetch failed, so save in indexedDB
    console.log( `PURGE FAILED:` );
    console.log( err.textContent );

    // clear form
    nameEl.value = "";
    amountEl.value = "";
    errorEl.textContent = "PURGE FAILED..."
  });
}

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

document.querySelector("#purge-btn").onclick = function() {
  purgeBudget();
};

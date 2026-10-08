// Supabase 대시보드에서 확인한 값을 직접 입력하세요.
const SUPABASE_URL = 'https://eovftrqmowvhzuvhaslq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdmZ0cnFtb3d2aHp1dmhhc2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTU1ODIsImV4cCI6MjEwNjk3MTU4Mn0.m4rymVk6UxVFk3CV9y1ZBzWT4eOEJHNtOg8KCwvsEsU';

// Supabase 클라이언트 변수 이름은 supabaseClient로 사용합니다.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 주문서와 주문 내역에서 사용할 HTML 요소를 가져옵니다.
const orderForm = document.getElementById('order-form');
const customerName = document.getElementById('customer-name');
const phoneNumber = document.getElementById('phone-number');
const drinkSelect = document.getElementById('drink');
const quantityInput = document.getElementById('quantity');
const estimatedPrice = document.getElementById('estimated-price');
const orderConfirmation = document.getElementById('order-confirmation');
const submitButton = orderForm.querySelector('button[type="submit"]');
const orderList = document.getElementById('order-list');
const orderCount = document.getElementById('order-count');
const orderSummary = document.getElementById('order-summary');
const totalOrderPrice = document.getElementById('total-order-price');
const clearOrdersButton = document.getElementById('clear-orders');

// 현재까지 접수된 주문을 저장하는 배열입니다.
const orders = [];

// 선택한 음료, 사이즈, 옵션, 수량을 이용해 총 금액을 계산합니다.
function calculateTotal() {
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];

  if (!drinkSelect.value) {
    return 0;
  }

  let unitPrice = Number(selectedDrink.dataset.price);
  const selectedSize = document.querySelector('input[name="size"]:checked');

  if (selectedSize) {
    unitPrice += Number(selectedSize.dataset.price);
  }

  const selectedExtras = document.querySelectorAll('input[name="extras"]:checked');
  selectedExtras.forEach((extra) => {
    unitPrice += Number(extra.dataset.price);
  });

  const quantity = Number(quantityInput.value) || 1;
  return unitPrice * quantity;
}

// 예상 금액 영역을 다시 계산해 화면에 표시합니다.
function updateEstimatedPrice() {
  estimatedPrice.textContent = `예상 금액: ${calculateTotal().toLocaleString()}원`;
}

// 가격이 표시된 음료 이름에서 가격 부분을 제거합니다.
function getDrinkName() {
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
  return selectedDrink.textContent.replace(/\s[\d,]+원$/, '');
}

// 선택한 추가 옵션의 이름만 배열로 가져옵니다.
function getSelectedExtraNames() {
  return Array.from(document.querySelectorAll('input[name="extras"]:checked')).map((extra) => {
    const label = document.querySelector(`label[for="${extra.id}"]`);
    return label.textContent.replace(/\s\+?[\d,]+원$/, '');
  });
}

// 주문 내역 한 건의 내용을 안전하게 카드로 그립니다.
// 손님이 입력한 내용은 innerHTML 대신 textContent로 넣습니다.
function createOrderCard(order) {
  const card = document.createElement('article');
  card.className = 'order-card';

  const topLine = document.createElement('div');
  topLine.className = 'order-card-top';
  const title = document.createElement('strong');
  title.textContent = `#${order.number} ${order.name}님 · ${order.price.toLocaleString()}원`;
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'cancel-order';
  cancelButton.textContent = '취소';
  cancelButton.dataset.orderNumber = order.number;
  topLine.append(title, cancelButton);

  const drinkLine = document.createElement('p');
  drinkLine.textContent = `${order.drink} ${order.size}사이즈${order.options.length ? ` (${order.options.join(', ')})` : ''} ${order.quantity}잔`;

  card.append(topLine, drinkLine);

  const detailLine = document.createElement('p');
  detailLine.className = 'order-card-detail';
  if (order.request) {
    detailLine.textContent = `요청사항: ${order.request} · ${order.time}`;
  } else {
    detailLine.textContent = order.time;
  }
  card.append(detailLine);

  return card;
}

// 주문 배열의 최신 주문부터 화면에 그립니다.
function renderOrders() {
  orderList.replaceChildren();
  orderCount.textContent = orders.length;

  if (orders.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-orders';
    emptyMessage.textContent = '아직 주문 내역이 없어요 ☕';
    orderList.append(emptyMessage);
    orderSummary.hidden = true;
    return;
  }

  orders.forEach((order) => {
    orderList.append(createOrderCard(order));
  });

  const total = orders.reduce((sum, order) => sum + order.price, 0);
  totalOrderPrice.textContent = `총 주문 금액: ${total.toLocaleString()}원 (${orders.length}건)`;
  orderSummary.hidden = false;
}

// 주문서 입력값이 바뀔 때 예상 금액을 갱신합니다.
drinkSelect.addEventListener('change', updateEstimatedPrice);
quantityInput.addEventListener('input', updateEstimatedPrice);
document.querySelectorAll('input[name="size"], input[name="extras"]').forEach((input) => {
  input.addEventListener('change', updateEstimatedPrice);
});

// 주문하기 버튼을 눌렀을 때 입력을 확인하고 주문을 접수합니다.
orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!customerName.value.trim()) {
    alert('이름을 입력해주세요');
    customerName.focus();
    return;
  }

  if (!drinkSelect.value) {
    alert('음료를 선택해주세요');
    drinkSelect.focus();
    return;
  }

  // 저장하는 동안 버튼을 잠가 중복 주문을 막습니다.
  submitButton.disabled = true;

  const selectedSize = document.querySelector('input[name="size"]:checked');
  const options = getSelectedExtraNames();
  const quantity = Number(quantityInput.value) || 1;
  const total = calculateTotal();
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
  const now = new Date();
  const time = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  try {
    // 폼의 값을 cafe_menu03 테이블의 열 이름에 맞춰 저장합니다.
    const { error } = await supabaseClient
      .from('cafe_menu03')
      .insert({
        customer_name: customerName.value.trim(),
        phone: phoneNumber.value.trim(),
        drink: getDrinkName(),
        drink_price: Number(selectedDrink.dataset.price),
        size: selectedSize ? selectedSize.value : '',
        options,
        quantity,
        request: document.getElementById('request').value.trim(),
        total_price: total,
      });

    if (error) {
      throw error;
    }

    // Supabase 저장이 성공한 뒤에만 화면의 주문 내역에도 추가합니다.
    const nextOrderNumber = orders.length > 0
      ? Math.max(...orders.map((order) => order.number)) + 1
      : 1;

    orders.unshift({
      number: nextOrderNumber,
      name: customerName.value.trim(),
      drink: getDrinkName(),
      size: selectedSize ? selectedSize.value : '',
      options,
      quantity,
      request: document.getElementById('request').value.trim(),
      price: total,
      time,
    });

    orderConfirmation.textContent = `${customerName.value.trim()}님, ${getDrinkName()} ${selectedSize.value}사이즈${options.length ? ` (${options.join(', ')})` : ''} ${quantity}잔, 총 ${total.toLocaleString()}원 주문이 접수되었습니다!`;
    orderConfirmation.hidden = false;
    renderOrders();
  } catch (error) {
    // 저장 실패 원인은 개발자가 확인할 수 있도록 콘솔에 출력합니다.
    console.error('Supabase 주문 저장 오류:', error);
    alert('주문 저장에 실패했어요');
  } finally {
    // 성공하거나 실패한 뒤에는 다시 주문할 수 있도록 버튼을 되돌립니다.
    submitButton.disabled = false;
  }
});

// 다시 작성은 현재 주문서만 초기화하고 주문 내역은 유지합니다.
orderForm.addEventListener('reset', () => {
  setTimeout(() => {
    estimatedPrice.textContent = '예상 금액: 0원';
    orderConfirmation.textContent = '';
    orderConfirmation.hidden = true;
  }, 0);
});

// 카드의 취소 버튼을 눌렀을 때 해당 주문을 삭제합니다.
orderList.addEventListener('click', (event) => {
  if (!event.target.classList.contains('cancel-order')) {
    return;
  }

  const orderNumber = Number(event.target.dataset.orderNumber);
  if (!confirm('이 주문을 취소할까요?')) {
    return;
  }

  const orderIndex = orders.findIndex((order) => order.number === orderNumber);
  if (orderIndex !== -1) {
    orders.splice(orderIndex, 1);
    renderOrders();
  }
});

// 모든 주문 내역을 한 번에 삭제합니다.
clearOrdersButton.addEventListener('click', () => {
  if (confirm('주문 내역을 모두 지울까요?')) {
    orders.length = 0;
    renderOrders();
  }
});

// 탭을 누르면 해당 화면만 보이도록 전환합니다.
document.querySelectorAll('.tab-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.hidden = true;
    });

    button.classList.add('active');
    document.getElementById(button.dataset.tab).hidden = false;
  });
});

updateEstimatedPrice();
renderOrders();

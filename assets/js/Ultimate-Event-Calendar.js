const date = new Date();

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const d = new Date();
document.getElementById("year").innerHTML = '<i class="fa fa-calendar-o"></i>' + ' ' + 'Today’s Date:' + ' ' + months[date.getMonth()] + ' ' + d.getDate() + ', ' + date.getFullYear();
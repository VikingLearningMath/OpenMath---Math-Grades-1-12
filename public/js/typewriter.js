/**
 * Typewriter effect (classic open-source snippet).
 * Cycles the words in each element's data-type attribute, typing and deleting.
 */
(function () {
  var TxtType = function (el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    this.txt = '';
    this.tick();
    this.isDeleting = false;
  };
  TxtType.prototype.tick = function () {
    var i = this.loopNum % this.toRotate.length;
    var fullTxt = this.toRotate[i];
    if (this.isDeleting) {
      this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
      this.txt = fullTxt.substring(0, this.txt.length + 1);
    }
    this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>';
    var that = this;
    var delta = 200 - Math.random() * 100;
    if (this.isDeleting) { delta /= 2; }
    if (!this.isDeleting && this.txt === fullTxt) {
      delta = this.period;
      this.isDeleting = true;
    } else if (this.isDeleting && this.txt === '') {
      this.isDeleting = false;
      this.loopNum++;
      delta = 500;
    }
    setTimeout(function () { that.tick(); }, delta);
  };

  var els = document.getElementsByClassName('typewrite');
  for (var i = 0; i < els.length; i++) {
    var toRotate = els[i].getAttribute('data-type');
    var period = els[i].getAttribute('data-period');
    if (toRotate) {
      new TxtType(els[i], JSON.parse(toRotate), period);
    }
  }
})();

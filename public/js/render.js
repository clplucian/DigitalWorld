$(document).ready(function(){
    $("#button-cloud").click(function(){
      $("#info-cloud").show(1000);
      $("#info-mail").hide(500);
      $("#info-design").hide(500);
      $("#info-hosting").hide(500);
    });
    $("#button-mail").click(function(){
      $("#info-cloud").hide(500);
      $("#info-mail").show(1000);
      $("#info-design").hide(500);
      $("#info-hosting").hide(500);
    });
    $("#button-design").click(function(){
      $("#info-cloud").hide(500);
      $("#info-mail").hide(500);
      $("#info-design").show(1000);
      $("#info-hosting").hide(500);
    });
    $("#button-hosting").click(function(){
      $("#info-cloud").hide(500);
      $("#info-mail").hide(500);
      $("#info-design").hide(500);
      $("#info-hosting").show(1000);
    });
  });
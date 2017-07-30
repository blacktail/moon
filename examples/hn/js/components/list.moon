<template>
  <div class="container list">
    <div class="container background">
      <div class="item" m-for="item,index in list">
        <div class="count-container text-right">
          <span class="count">{{(index + 1)}}</span>
        </div>
        <div class="title-container vertical-align">
          <a class="title" href="{{item.url}}" rel="noopener">{{item.title}}</a>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
  .list {
    padding-top: 30px;
    height: 100%;
    background-color: #FDFDFD;
  }

  .item {
    display: flex;
    flex-direction: row;
  }

  .count-container {
    margin-left: 0;
    margin-right: 30px;
  }

  .count {
    color: #666666;
    font-weight: 100;
    font-size: 2.5rem;
  }

  .title {
    color: #111111;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 0;
    font-size: 1.5rem;
    text-decoration: none;
  }
</style>
<script>
  var store = require("../store/store.js").store;

  exports = {
    props: ["route"],
    data: function() {
      return {
        list: []
      }
    },
    hooks: {
      mounted: function() {
        var store = this.get("store");
        var params = this.get("route").params;
        var type = params.type;
        var page = params.page;

        if(type === undefined) {
          type = "top";
        }

        if(page === undefined) {
          page = 1;
        }

        store.dispatch("UPDATE_LISTS", {
          type: type,
          page: page,
          instance: this
        });
      }
    },
    store: store
  }
</script>

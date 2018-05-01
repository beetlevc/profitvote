require('./assets/fonts.css')
require('./assets/app.css')
require('./assets/bvc.css')

import { initTranslator, CurrentLocale } from './Translator'
import { initRelativeFormat } from './utils/RelativeFormat'
import * as queryString  from 'query-string'
const windowLocation = window.location;
const parsedQueryString = queryString.parse(windowLocation.search);
const locale: string = parsedQueryString.lang === "ru" ? "ru" : "en";
initTranslator(locale);
initRelativeFormat();

// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import AppVM from './view_models/AppVM'
import PostVM from './view_models/PostVM'
import * as counterpart from 'counterpart'
import { PostViewer } from './models/Settings' 
import { ContestStage } from './models/ContestStage';
// import * as $ from "jquery";
Vue.config.productionTip = false;

const appVM = new AppVM();

/* eslint-disable no-new */
const appVMP = new Vue({
  data: appVM,
  computed: {
    currentLocale: function(): string {
      return CurrentLocale;
    },
    pathname: function(): string {
      return windowLocation.pathname;
    },  
    posts: function(): PostVM[] {
      // `this` points to the vm instance
      return appVM._posts;
    },
    postCount: function(): number {
      // `this` points to the vm instance
      return appVM.postCount;
    },
    visiblePostCount: function(): number {
      // `this` points to the vm instance
      return appVM.visiblePostCount;
    },
    showAllPosts: {
      get: function(): boolean {
        return appVM._showAllPosts;
      },
      set: function(newValue: boolean) {
        appVM._showAllPosts = newValue;
        appVM.loadMoreIfNeeded();
      }
    },
    contestStage: {
      get: function(): ContestStage {
        return appVM._contestStage;
      },
      set: function(newValue: ContestStage) {
        appVM._contestStage = newValue;
        appVM.loadMoreIfNeeded();
      }
    },
  },
  methods: {
    tt: function (key: string|string[], options?: object): string {
      return counterpart(key, options);
    },
    formatDateTime: function (value?: Date): string {
      return value ? value.toLocaleString(CurrentLocale) : "";
    },
    getCompleteUrl: function (path: string): string {
      const baseUrl = appVM.settings.postViewer === PostViewer.Busy ? "https://busy.org" : "https://steemit.com";
      return baseUrl.concat(path);
    }, 
    toggleBlogmode: function (event: any) {
      // `this` inside methods point to the Vue instance
      // `event` is the native DOM event
      // console.log(this, event);
      this.blogmode = !this.blogmode;
    },
    hideSettings: function (event: any) {
      appVM.hideSettingsPanel();
    },
    smartToggleSettings: function (event: Event) {
      const srcElement = event.srcElement;
      if (srcElement && srcElement.classList.contains("toggle-menu")) {
        appVM.showSettingsPanel();
      } else {
        appVM.hideSettingsPanel();
      }
    },
    saveSettings: function (event: any) {
      appVM.applySettings();
    },
  }
});
appVMP.$mount("#content");

import "vue-router";

declare module "vue-router" {
  interface RouteParams {
    id?: string;
  }
}

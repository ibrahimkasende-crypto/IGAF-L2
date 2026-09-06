import { createElement, type ImgHTMLAttributes } from "react";

export default function SafeImg(props: ImgHTMLAttributes<HTMLImageElement>) {
  return createElement("img", props);
}

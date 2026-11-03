import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"

gsap.registerPlugin(useGSAP, DrawSVGPlugin)

gsap.defaults({ ease: "power2.out" })

export { gsap, useGSAP }

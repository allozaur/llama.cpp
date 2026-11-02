import{p as A,f as v,m as p,a,s as l,d as O,e as D}from"./iframe-BxvSZK0j.js";import{c as T,i as q,d as W}from"./create-runtime-stories-DF7OwIoM.js";import{S as j,a as c}from"./StateGalleryItem-BMGszy9q.js";import{B as s}from"./button-xywSqPau.js";import{B as m,a as h}from"./button-group-separator-BccWv2la.js";import{C as k}from"./copy-DUPeaLcG.js";import{P as F}from"./pencil-9rXUpy81.js";import{T as H}from"./trash-BrTaTTho.js";import{C as y}from"./chevron-down-D7MPUDbV.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";const J={component:m,parameters:{layout:"centered"},title:"Design system/Actions/ButtonGroup"},{Story:K}=W();var _=D("<!> <!> <!>",1),L=D("<!> <!> <!> <!> <!> <!> <!>",1);function R(g,z){A(z,!1),q(),K(g,{asChild:!0,name:"Default",children:(w,Q)=>{j(w,{columns:2,minItemWidth:"16rem",children:(E,U)=>{var P=L(),G=v(P);c(G,{label:"Outline",children:(u,f)=>{m(u,{children:($,B)=>{var e=_(),r=v(e);s(r,{variant:"outline",children:(t,i)=>{var o=p("Copy");a(t,o)},$$slots:{default:!0}});var n=l(r,2);s(n,{variant:"outline",children:(t,i)=>{var o=p("Edit");a(t,o)},$$slots:{default:!0}});var d=l(n,2);s(d,{variant:"outline",children:(t,i)=>{var o=p("Delete");a(t,o)},$$slots:{default:!0}}),a($,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var S=l(G,2);c(S,{label:"Icons",children:(u,f)=>{m(u,{children:($,B)=>{var e=_(),r=v(e);s(r,{"aria-label":"Copy",size:"icon",variant:"outline",children:(t,i)=>{k(t,{})},$$slots:{default:!0}});var n=l(r,2);s(n,{"aria-label":"Edit",size:"icon",variant:"outline",children:(t,i)=>{F(t,{})},$$slots:{default:!0}});var d=l(n,2);s(d,{"aria-label":"Delete",size:"icon",variant:"outline",children:(t,i)=>{H(t,{})},$$slots:{default:!0}}),a($,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var b=l(S,2);c(b,{label:"Split",note:"with separator",children:(u,f)=>{m(u,{children:($,B)=>{var e=_(),r=v(e);s(r,{variant:"outline",children:(t,i)=>{var o=p("Send");a(t,o)},$$slots:{default:!0}});var n=l(r,2);h(n,{});var d=l(n,2);s(d,{"aria-label":"More options",size:"icon",variant:"outline",children:(t,i)=>{y(t,{})},$$slots:{default:!0}}),a($,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var C=l(b,2);c(C,{label:"Small split",note:"as in tool permission requests",children:(u,f)=>{m(u,{children:($,B)=>{var e=_(),r=v(e);s(r,{size:"sm",variant:"outline",children:(t,i)=>{var o=p("Allow once");a(t,o)},$$slots:{default:!0}});var n=l(r,2);h(n,{});var d=l(n,2);s(d,{"aria-label":"More allow options",class:"px-2",size:"sm",variant:"outline",children:(t,i)=>{y(t,{})},$$slots:{default:!0}}),a($,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var I=l(C,2);c(I,{label:"Primary split",children:(u,f)=>{m(u,{children:($,B)=>{var e=_(),r=v(e);s(r,{children:(t,i)=>{var o=p("Send");a(t,o)},$$slots:{default:!0}});var n=l(r,2);h(n,{});var d=l(n,2);s(d,{"aria-label":"More options",size:"icon",children:(t,i)=>{y(t,{})},$$slots:{default:!0}}),a($,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var x=l(I,2);c(x,{label:"Primary",children:(u,f)=>{m(u,{children:($,B)=>{var e=_(),r=v(e);s(r,{children:(t,i)=>{var o=p("Copy");a(t,o)},$$slots:{default:!0}});var n=l(r,2);s(n,{children:(t,i)=>{var o=p("Edit");a(t,o)},$$slots:{default:!0}});var d=l(n,2);s(d,{children:(t,i)=>{var o=p("Delete");a(t,o)},$$slots:{default:!0}}),a($,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var M=l(x,2);c(M,{label:"Secondary",children:(u,f)=>{m(u,{children:($,B)=>{var e=_(),r=v(e);s(r,{variant:"secondary",children:(t,i)=>{var o=p("Copy");a(t,o)},$$slots:{default:!0}});var n=l(r,2);s(n,{variant:"secondary",children:(t,i)=>{var o=p("Edit");a(t,o)},$$slots:{default:!0}});var d=l(n,2);s(d,{variant:"secondary",children:(t,i)=>{var o=p("Delete");a(t,o)},$$slots:{default:!0}}),a($,e)},$$slots:{default:!0}})},$$slots:{default:!0}}),a(E,P)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={2} minItemWidth="16rem">
	<StateGalleryItem label="Outline">
		<ButtonGroup.Root>
			<Button variant="outline">Copy</Button>

			<Button variant="outline">Edit</Button>

			<Button variant="outline">Delete</Button>
		</ButtonGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Icons">
		<ButtonGroup.Root>
			<Button aria-label="Copy" size="icon" variant="outline"><Copy /></Button>

			<Button aria-label="Edit" size="icon" variant="outline"><Pencil /></Button>

			<Button aria-label="Delete" size="icon" variant="outline"><Trash2 /></Button>
		</ButtonGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Split" note="with separator">
		<ButtonGroup.Root>
			<Button variant="outline">Send</Button>

			<ButtonGroup.Separator />

			<Button aria-label="More options" size="icon" variant="outline"><ChevronDown /></Button>
		</ButtonGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Small split" note="as in tool permission requests">
		<ButtonGroup.Root>
			<Button size="sm" variant="outline">Allow once</Button>

			<ButtonGroup.Separator />

			<Button aria-label="More allow options" class="px-2" size="sm" variant="outline">
				<ChevronDown />
			</Button>
		</ButtonGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Primary split">
		<ButtonGroup.Root>
			<Button>Send</Button>

			<ButtonGroup.Separator />

			<Button aria-label="More options" size="icon"><ChevronDown /></Button>
		</ButtonGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Primary">
		<ButtonGroup.Root>
			<Button>Copy</Button>

			<Button>Edit</Button>

			<Button>Delete</Button>
		</ButtonGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Secondary">
		<ButtonGroup.Root>
			<Button variant="secondary">Copy</Button>

			<Button variant="secondary">Edit</Button>

			<Button variant="secondary">Delete</Button>
		</ButtonGroup.Root>
	</StateGalleryItem>
</StateGallery>`}}}),O()}R.__docgen={data:[],name:"ButtonGroup.stories.svelte"};const N=T(R,J),$t=["Default"],dt={...N.Default,tags:["svelte-csf-v5"]};export{dt as Default,$t as __namedExportsOrder,J as default};

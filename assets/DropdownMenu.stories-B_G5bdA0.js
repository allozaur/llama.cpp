import{p as N,f as l,s as e,m as s,a as o,a3 as Q,d as U,e as _,b as V}from"./iframe-BxvSZK0j.js";import{c as X,i as Y,d as Z}from"./create-runtime-stories-DF7OwIoM.js";import{B as oo}from"./button-xywSqPau.js";import{R as E,D as eo,a as ro,b as no,c as to,d as w,e as ao,f as x,g as L,h as so,i as uo,j as b,S as po,k as lo,l as io}from"./index-XKzLgq2d.js";import{P as _o}from"./pencil-9rXUpy81.js";import{D as mo}from"./download-iVMq-bXa.js";import{T as $o}from"./trash-BrTaTTho.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./minus-BiJPcaSd.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./check-DMUsyudZ.js";import"./circle-DEMsv9Zq.js";import"./chevron-right-DSI_V293.js";import"./floating-layer-anchor-DpndBh7P.js";const vo={component:E,parameters:{layout:"centered"},title:"Design system/Overlays/DropdownMenu"},{Story:wo}=Z();var Do=_("<!> Rename <!>",1),co=_("<!> Export",1),ho=_("<!> <!> <!>",1),fo=_("<!> <!> <!> <!>",1),I=_("<!> <!>",1),Mo=_("<!> Delete",1),go=_("<!> <!> <!> <!> <!> <!> <!> <!> <!>",1),Po=_('<div class="h-96"><!></div>');function F(O,W){N(W,!1),Y(),wo(O,{asChild:!0,name:"Default",children:(j,bo)=>{var R=Po(),q=V(R);E(q,{open:!0,children:(z,Io)=>{var S=I(),C=l(S);eo(C,{child:(T,D)=>{oo(T,Q(()=>D?.().props,{variant:"outline",children:(c,g)=>{var h=s("Conversation");o(c,h)},$$slots:{default:!0}}))},$$slots:{child:!0}});var A=e(C,2);ro(A,{class:"w-56",children:(k,T)=>{var D=go(),M=l(D);no(M,{children:(d,$)=>{var r=ho(),u=l(r);to(u,{children:(p,n)=>{var t=s("Conversation");o(p,t)},$$slots:{default:!0}});var m=e(u,2);w(m,{children:(p,n)=>{var t=Do(),a=l(t);_o(a,{});var v=e(a,2);ao(v,{children:(P,f)=>{var K=s("F2");o(P,K)},$$slots:{default:!0}}),o(p,t)},$$slots:{default:!0}});var i=e(m,2);w(i,{children:(p,n)=>{var t=co(),a=l(t);mo(a,{}),o(p,t)},$$slots:{default:!0}}),o(d,r)},$$slots:{default:!0}});var c=e(M,2);x(c,{});var g=e(c,2);L(g,{checked:!0,children:(d,$)=>{var r=s("Show statistics");o(d,r)},$$slots:{default:!0}});var h=e(g,2);L(h,{children:(d,$)=>{var r=s("Render markdown in user messages");o(d,r)},$$slots:{default:!0}});var G=e(h,2);x(G,{});var y=e(G,2);so(y,{value:"medium",children:(d,$)=>{var r=fo(),u=l(r);uo(u,{children:(n,t)=>{var a=s("Reasoning");o(n,a)},$$slots:{default:!0}});var m=e(u,2);b(m,{value:"low",children:(n,t)=>{var a=s("Low");o(n,a)},$$slots:{default:!0}});var i=e(m,2);b(i,{value:"medium",children:(n,t)=>{var a=s("Medium");o(n,a)},$$slots:{default:!0}});var p=e(i,2);b(p,{value:"high",children:(n,t)=>{var a=s("High");o(n,a)},$$slots:{default:!0}}),o(d,r)},$$slots:{default:!0}});var B=e(y,2);x(B,{});var H=e(B,2);po(H,{children:(d,$)=>{var r=I(),u=l(r);lo(u,{children:(i,p)=>{var n=s("Move to");o(i,n)},$$slots:{default:!0}});var m=e(u,2);io(m,{children:(i,p)=>{var n=I(),t=l(n);w(t,{children:(v,P)=>{var f=s("Work");o(v,f)},$$slots:{default:!0}});var a=e(t,2);w(a,{children:(v,P)=>{var f=s("Personal");o(v,f)},$$slots:{default:!0}}),o(i,n)},$$slots:{default:!0}}),o(d,r)},$$slots:{default:!0}});var J=e(H,2);w(J,{variant:"destructive",children:(d,$)=>{var r=Mo(),u=l(r);$o(u,{}),o(d,r)},$$slots:{default:!0}}),o(k,D)},$$slots:{default:!0}}),o(z,S)},$$slots:{default:!0}}),o(j,R)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="h-96">
	<DropdownMenu.Root open>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline">Conversation</Button>
			{/snippet}
		</DropdownMenu.Trigger>

		<DropdownMenu.Content class="w-56">
			<DropdownMenu.Group>
				<DropdownMenu.Label>Conversation</DropdownMenu.Label>

				<DropdownMenu.Item>
					<Pencil /> Rename
					<DropdownMenu.Shortcut>F2</DropdownMenu.Shortcut>
				</DropdownMenu.Item>

				<DropdownMenu.Item><Download /> Export</DropdownMenu.Item>
			</DropdownMenu.Group>

			<DropdownMenu.Separator />

			<DropdownMenu.CheckboxItem checked>Show statistics</DropdownMenu.CheckboxItem>

			<DropdownMenu.CheckboxItem>Render markdown in user messages</DropdownMenu.CheckboxItem>

			<DropdownMenu.Separator />

			<DropdownMenu.RadioGroup value="medium">
				<DropdownMenu.GroupHeading>Reasoning</DropdownMenu.GroupHeading>

				<DropdownMenu.RadioItem value="low">Low</DropdownMenu.RadioItem>

				<DropdownMenu.RadioItem value="medium">Medium</DropdownMenu.RadioItem>

				<DropdownMenu.RadioItem value="high">High</DropdownMenu.RadioItem>
			</DropdownMenu.RadioGroup>

			<DropdownMenu.Separator />

			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>Move to</DropdownMenu.SubTrigger>

				<DropdownMenu.SubContent>
					<DropdownMenu.Item>Work</DropdownMenu.Item>

					<DropdownMenu.Item>Personal</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>

			<DropdownMenu.Item variant="destructive"><Trash2 /> Delete</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>`}}}),U()}F.__docgen={data:[],name:"DropdownMenu.stories.svelte"};const xo=X(F,vo),Ao=["Default"],Jo={...xo.Default,tags:["svelte-csf-v5"]};export{Jo as Default,Ao as __namedExportsOrder,vo as default};

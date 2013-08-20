msgcenter
=========

A message routing framework for cluster architecture

工作原理
=======

消息中心转发消息

根据用户id转发消息

如果用户id不存在，则将消息转发到黑洞服务器（离线服务器），用于将消息存入暂存箱。
